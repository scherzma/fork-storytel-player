import axios, { AxiosInstance } from "axios";
import { encryptPassword } from "./passwordCrypt";
import { appLogger } from "./logger";

interface AccountInfo {
  jwt: string;
  singleSignToken: string;
}

interface LoginData {
  accountInfo: AccountInfo;
}

interface Bookmark {
  id: string;
  position: number;
  note?: string;
}

interface BookmarkResponse {
  bookmarks: Bookmark[];
}

interface StorytelAuthError extends Error {
  isStorytelUnauthorized: boolean;
  storytelStatus?: number;
  storytelData?: unknown;
  isLoginFailure?: boolean;
}

export interface SsoSession {
  storytelSession: string;
  firebaseRefreshToken: string;
  firebaseApiKey: string;
  email: string;
  cid: string;
}

const FIREBASE_TOKEN_URL = "https://securetoken.googleapis.com";
const FIREBASE_REFERER = "https://www.storytel.com/";
const FIREBASE_ID_TOKEN_TTL_BUFFER_SECONDS = 60;

// --- Bookshelf ---------------------------------------------------------------

// Raw shape returned by POST https://api.storytel.net/libraries/bookshelf
interface RawBookshelfNamedEntity {
  id: string;
  name: string;
  deepLink?: string;
}

interface RawBookshelfFormat {
  id: string;
  type: "abook" | "ebook";
  durationInMilliseconds?: number;
  durationInCharacters?: number;
  cover?: { url: string; width: number; height: number };
  position?: { position: number; updatedTime: string; kidsMode: boolean };
}

interface RawBookshelfModel {
  id: string;
  title: string;
  state: "CONSUMING" | "CONSUMED" | "WILL_CONSUME" | string;
  kidsBook?: boolean;
  authors?: RawBookshelfNamedEntity[];
  narrators?: RawBookshelfNamedEntity[];
  series?: RawBookshelfNamedEntity[];
  formats?: RawBookshelfFormat[];
  category?: { id: number; name: string };
}

interface RawBookshelfResponse {
  resourceVersion?: string;
  items?: Record<string, { action: string; model: RawBookshelfModel }>;
  followingItems?: Record<string, unknown>;
  collections?: Record<string, unknown>;
}

// Subset of the legacy BookShelfEntity (client/src/interfaces/books.ts) that
// the frontend actually reads. Keep the keys aligned with that interface so
// the React app keeps working unchanged.
interface BookShelfEntity {
  id: string;
  status: number;
  book: {
    name: string;
    authorsAsString: string;
    authors?: Array<{ id: string; name: string }>;
    series?: Array<{ id: string; name: string }>;
    seriesOrder?: number;
    consumableId: string;
    largeCover: string;
    largeCoverE: string;
    category: { title: string };
    language: { localizedName: string };
  };
  abook: {
    id: string;
    narratorAsString: string;
    time: number;
    description: string;
  } | null;
  abookMark: { pos: number } | null;
  ebook: RawBookshelfFormat | null;
  isInLibrary?: boolean;
}

interface BookShelfResponse {
  books: BookShelfEntity[];
}

interface RawCatalogBook {
  abook?: {
    allowedToStream?: boolean;
    description?: string;
    display?: boolean;
    id?: string | number;
    narratorAsString?: string;
    time?: number;
  };
  abookMark?: { pos?: number } | null;
  book?: {
    authorsAsString?: string;
    authors?: Array<{ id?: string | number; name?: string }>;
    category?: { title?: string };
    consumableId?: string | number;
    language?: { localizedName?: string };
    largeCover?: string;
    largeCoverE?: string;
    name?: string;
    series?: Array<{ id?: string | number; name?: string }>;
    seriesOrder?: number;
  };
  restriction?: number;
}

interface RawCatalogSearchResponse {
  books?: RawCatalogBook[];
}

export function buildBookshelfUpdateRequest(
  consumableId: string,
  resourceVersion: string | null,
  saved: boolean,
) {
  const item = saved
    ? {
        millisecondsSinceEvent: 0,
        action: "SET",
        state: "WILL_CONSUME",
      }
    : {
        millisecondsSinceEvent: 0,
        action: "DELETE",
      };

  return {
    resourceVersion,
    items: {
      [consumableId]: item,
    },
    followingItems: null,
    collections: null,
  };
}

export function buildBookshelfUpdateHeaders(bearer: string) {
  return {
    Authorization: `Bearer ${bearer}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.storytel.library-delta+json;v=1.4",
  };
}

class StorytelClient {
  private client: AxiosInstance;
  public loginData: LoginData;
  private ssoSession: SsoSession | null = null;
  private cachedFirebaseIdToken: { token: string; expiresAt: number } | null =
    null;

  constructor() {
    this.client = axios.create({
      headers: {
        "x-storytel-terminal": "ios",
        "user-agent": "Storytel/25.38.0 (iOS 26.0; iPhone16,2) Release/924.1",
      },
      maxRedirects: 0,
      validateStatus: function (status) {
        return status < 400;
      },
      timeout: 30000,
      params: {
        version: "25.38.0",
      },
    });

    this.client.interceptors.request.use((request) => {
      const url = request.url || "";
      appLogger.add({
        type: "http_request",
        message: `[${request.method?.toUpperCase()}] ${url}`,
        method: request.method?.toUpperCase(),
        url,
      });
      return request;
    });

    this.client.interceptors.response.use(
      (response) => {
        const url = response.config.url || "";
        appLogger.add({
          type: "http_response",
          message: `[${response.status}] ${url}`,
          status: response.status,
          method: response.config.method?.toUpperCase(),
          url,
        });
        return response;
      },
      (error) => {
        const url = error.config?.url || "";
        const isLoginRequest = url.includes("login.action");
        appLogger.add({
          type: "error",
          message: `[Error ${error.response?.status || "N/A"}] ${url}`,
          status: error.response?.status,
          method: error.config?.method?.toUpperCase(),
          url,
          data: error.message,
        });
        // Propagate Storytel 401 as a distinct error type so Fastify routes
        // can return 401 to the frontend instead of a generic 500.
        if (error.response?.status === 401) {
          const authError: StorytelAuthError = new Error(
            isLoginRequest
              ? "Storytel login rejected"
              : "Storytel session expired",
          ) as StorytelAuthError;
          authError.isStorytelUnauthorized = true;
          authError.isLoginFailure = isLoginRequest;
          authError.storytelStatus = error.response.status;
          authError.storytelData = error.response.data;
          return Promise.reject(authError);
        }
        return Promise.reject(error);
      },
    );

    this.loginData = {
      accountInfo: {
        jwt: "",
        singleSignToken: "",
      },
    };
  }

  async login(email: string, password: string): Promise<LoginData> {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const encryptedPassword = encryptPassword(trimmedPassword);
    const url = "https://www.storytel.com/api/login.action";
    const params = {
      m: 1,
      uid: trimmedEmail,
      pwd: encryptedPassword,
    };

    try {
      const response = await this.client.get<LoginData>(url, {
        params,
      });
      this.loginData = response.data;
      this.ssoSession = null;
      this.cachedFirebaseIdToken = null;
      return this.loginData;
    } catch (error: any) {
      if (error.isStorytelUnauthorized) {
        throw error;
      }
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  loginViaSso(session: SsoSession): void {
    this.ssoSession = session;
    this.cachedFirebaseIdToken = null;
    // Mark legacy credentials as unset so any accidental fallback path errors
    // visibly instead of using stale data.
    this.loginData = {
      accountInfo: { jwt: "", singleSignToken: "" },
    };
  }

  getSsoSession(): SsoSession | null {
    return this.ssoSession;
  }

  // Token to send as ?token=... on the legacy *.action endpoints. In SSO mode
  // we substitute the Firebase Session Cookie, which the Storytel API treats
  // interchangeably with the singleSignToken returned by login.action.
  private getLegacyActionToken(): string {
    if (this.ssoSession) return this.ssoSession.storytelSession;
    return this.loginData.accountInfo.singleSignToken;
  }

  private async ensureFirebaseIdToken(): Promise<string> {
    if (!this.ssoSession) {
      throw new Error("ensureFirebaseIdToken called outside SSO mode");
    }
    const now = Math.floor(Date.now() / 1000);
    const cached = this.cachedFirebaseIdToken;
    if (
      cached &&
      cached.expiresAt - FIREBASE_ID_TOKEN_TTL_BUFFER_SECONDS > now
    ) {
      return cached.token;
    }
    const params = new URLSearchParams();
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", this.ssoSession.firebaseRefreshToken);
    try {
      const response = await axios.post<{
        id_token?: string;
        access_token?: string;
        expires_in: string;
        refresh_token?: string;
      }>(
        `${FIREBASE_TOKEN_URL}/v1/token?key=${this.ssoSession.firebaseApiKey}`,
        params.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Referer: FIREBASE_REFERER,
            Origin: "https://www.storytel.com",
          },
          timeout: 15000,
        },
      );
      const accessToken = response.data.id_token ?? response.data.access_token;
      if (!accessToken) {
        throw new Error("Firebase token response did not include an ID token");
      }
      const expiresIn = parseInt(response.data.expires_in, 10) || 3600;
      this.cachedFirebaseIdToken = {
        token: accessToken,
        expiresAt: now + expiresIn,
      };
      return accessToken;
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 400 || status === 401 || status === 403) {
        const authError: any = new Error("Firebase refresh token rejected");
        authError.isStorytelUnauthorized = true;
        throw authError;
      }
      throw new Error(`Firebase token refresh failed: ${error.message}`);
    }
  }

  // Bearer to send on api.storytel.net/* endpoints. SSO mode: fresh Firebase
  // ID token (auto-refreshed via the long-lived refresh token). Legacy mode:
  // the JWT returned by login.action.
  private async getApiBearer(): Promise<string> {
    if (this.ssoSession) return this.ensureFirebaseIdToken();
    return this.loginData.accountInfo.jwt;
  }

  async getBookmarkPositional(
    consumableId: string | null = null,
  ): Promise<Bookmark[]> {
    const url = `https://api.storytel.net/bookmarks/positional?kidsMode=false&orderBy=updated&orderDirection=desc`;

    try {
      const bearer = await this.getApiBearer();
      const response = await this.client.get<{ bookmarks: Bookmark[] }>(url, {
        params: {
          ...(consumableId && { consumableIds: consumableId }),
        },
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      });
      return response.data.bookmarks;
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to get bookmark positional: ${error.message}`);
    }
  }

  async updateBookmarkPositional(
    consumableId: string,
    position: number,
    deviceId: string,
  ): Promise<any> {
    const url = `https://api.storytel.net/bookmarks/positional`;

    try {
      const bearer = await this.getApiBearer();
      const response = await this.client.post(
        url,
        {
          deviceId: deviceId,
          action: "player_paused",
          secondsSinceCreated: 0,
          position,
          type: "abook",
          kidsMode: false,
          consumableId: consumableId,
        },
        {
          headers: {
            Authorization: `Bearer ${bearer}`,
          },
        },
      );
      return response.data;
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to get bookmark positional: ${error.message}`);
    }
  }

  async getBookshelf(): Promise<BookShelfResponse> {
    try {
      const data = await this.getLibrarySnapshot();

      // The endpoint returns { items: { "<id>": { action, model } } } with a
      // shape that differs from the legacy getBookShelf.action response. Remap
      // each `model` onto the legacy BookShelfEntity keys so the existing
      // frontend keeps working unchanged.
      const items = data?.items;
      if (!items || typeof items !== "object") return { books: [] };

      // Library state -> the three states displayed by the desktop client.
      const stateToStatus: Record<string, number> = {
        WILL_CONSUME: 1,
        CONSUMING: 2,
        CONSUMED: 3,
      };

      const books = Object.values(items)
        .map((entry) => entry?.model)
        .filter(Boolean)
        .map((model): BookShelfEntity => {
          const formats: RawBookshelfFormat[] = Array.isArray(model.formats)
            ? model.formats
            : [];
          const abookFormat = formats.find((f) => f.type === "abook");
          const ebookFormat = formats.find((f) => f.type === "ebook");
          const coverUrl =
            abookFormat?.cover?.url ?? ebookFormat?.cover?.url ?? "";
          const join = (arr?: RawBookshelfNamedEntity[]) =>
            (Array.isArray(arr) ? arr : [])
              .map((x) => x?.name)
              .filter(Boolean)
              .join(", ");
          const namedEntities = (arr?: RawBookshelfNamedEntity[]) =>
            (Array.isArray(arr) ? arr : [])
              .filter((entry) => Boolean(entry?.name))
              .map((entry) => ({ id: String(entry.id), name: entry.name.trim() }));

          return {
            id: model.id,
            status: stateToStatus[model.state] ?? 1,
            book: {
              name: model.title,
              authorsAsString: join(model.authors),
              authors: namedEntities(model.authors),
              series: namedEntities(model.series),
              consumableId: String(model.id),
              // Full absolute URL (covers.storytel.com). See note below.
              largeCover: coverUrl,
              largeCoverE: "",
              category: { title: model.category?.name ?? "" },
              language: { localizedName: "" },
            },
            abook: abookFormat
              ? {
                  id: abookFormat.id,
                  narratorAsString: join(model.narrators),
                  // Legacy frontend expects microseconds; API gives ms.
                  time: (abookFormat.durationInMilliseconds ?? 0) * 1000,
                  description: "",
                }
              : null,
            abookMark: abookFormat?.position
              ? { pos: (abookFormat.position.position ?? 0) * 1000 }
              : null,
            ebook: ebookFormat ?? null,
            isInLibrary: true,
          };
        });

      return { books };
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      console.error(error);
      throw new Error(`Failed to get bookshelf: ${error.message}`);
    }
  }

  private async getLibrarySnapshot(): Promise<RawBookshelfResponse> {
    const bearer = await this.getApiBearer();
    const response = await this.client.post<RawBookshelfResponse>(
      "https://api.storytel.net/libraries/bookshelf",
      { items: [] },
      {
        headers: {
          Authorization: `Bearer ${bearer}`,
          // Storytel's full bookshelf read still expects the legacy form
          // request. The vendor delta media type is only accepted for writes.
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "*/*",
        },
      },
    );
    return response.data;
  }

  async setBookshelfSaved(consumableId: string, saved: boolean): Promise<void> {
    const url = "https://api.storytel.net/libraries/bookshelf";

    try {
      // Storytel rejects stale resource versions. Refresh and retry once if
      // another device changes the bookshelf between our read and write.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const snapshot = await this.getLibrarySnapshot();
        const alreadySaved = Boolean(snapshot.items?.[consumableId]?.model);
        if (alreadySaved === saved) return;

        try {
          const bearer = await this.getApiBearer();
          await this.client.post(
            url,
            buildBookshelfUpdateRequest(
              consumableId,
              snapshot.resourceVersion ?? null,
              saved,
            ),
            {
              headers: buildBookshelfUpdateHeaders(bearer),
            },
          );
          return;
        } catch (error: any) {
          if (error.response?.status !== 409 || attempt === 1) throw error;
        }
      }
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to update bookshelf: ${error.message}`);
    }
  }

  async searchCatalog(query: string): Promise<BookShelfResponse> {
    const url = "https://www.storytel.com/api/search.action";

    try {
      const response = await this.client.get<RawCatalogSearchResponse>(url, {
        params: {
          q: query,
          token: this.getLegacyActionToken(),
        },
      });

      const rawBooks = Array.isArray(response.data?.books)
        ? response.data.books
        : [];
      const text = (value: unknown, maxLength = 500): string =>
        typeof value === "string" ? value.trim().slice(0, maxLength) : "";
      const identifier = (value: unknown): string => {
        const candidate = String(value ?? "");
        return /^[A-Za-z0-9_-]{1,128}$/.test(candidate) ? candidate : "";
      };
      const nonNegativeNumber = (value: unknown): number => {
        const candidate = Number(value);
        return Number.isFinite(candidate) && candidate >= 0 ? candidate : 0;
      };
      const namedEntities = (value: unknown): Array<{ id: string; name: string }> =>
        (Array.isArray(value) ? value : []).flatMap((entry) => {
          const name = text(entry?.name);
          if (!name) return [];
          return [{ id: identifier(entry?.id), name }];
        });

      const books = rawBooks.slice(0, 100).flatMap((entry) => {
        const rawBook = entry?.book;
        const rawAudio = entry?.abook;
        const consumableId = identifier(rawBook?.consumableId);
        const audioId = identifier(rawAudio?.id);
        const title = text(rawBook?.name);
        if (
          !rawBook ||
          !rawAudio ||
          !consumableId ||
          !audioId ||
          !title ||
          rawAudio.allowedToStream === false ||
          rawAudio.display === false ||
          entry.restriction === 1
        ) {
          return [];
        }

        const authors = namedEntities(rawBook.authors);
        const series = namedEntities(rawBook.series);

        const book: BookShelfEntity = {
          id: consumableId,
          status: 1,
          book: {
            name: title,
            authorsAsString: text(rawBook.authorsAsString) || authors.map(author => author.name).join(", "),
            authors,
            series,
            seriesOrder: nonNegativeNumber(rawBook.seriesOrder),
            consumableId,
            largeCover: text(rawBook.largeCover, 2048),
            largeCoverE: text(rawBook.largeCoverE, 2048),
            category: { title: text(rawBook.category?.title) },
            language: {
              localizedName: text(rawBook.language?.localizedName),
            },
          },
          abook: {
            id: audioId,
            narratorAsString: text(rawAudio.narratorAsString),
            time: nonNegativeNumber(rawAudio.time),
            description: text(rawAudio.description, 5000),
          },
          abookMark: entry.abookMark
            ? { pos: nonNegativeNumber(entry.abookMark.pos) }
            : null,
          ebook: null,
        };
        return [book];
      });

      return { books };
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to search catalog: ${error.message}`);
    }
  }

  async getBookDetails(consumableId: string): Promise<any> {
    const url = `https://api.storytel.net/book-details/consumables/${consumableId}?kidsMode=false&configVariant=default`;

    try {
      const bearer = await this.getApiBearer();
      const response = await this.client.get(url, {
        headers: {
          Authorization: `Bearer ${bearer}`,
          Accept: "*/*",
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to get book details: ${error.message}`);
    }
  }

  async getPlayBookMetaData(consumableId: string): Promise<any> {
    const url = `https://api.storytel.net/playback-metadata/consumable/${consumableId}`;

    try {
      const bearer = await this.getApiBearer();
      const response = await this.client.get(url, {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to get bookinfo: ${error.message}`);
    }
  }

  // New api.storytel.net audio endpoint. Returns a 302 redirect to a signed
  // mp3 URL on the CDN. Keyed by consumableId (not the abook/program id).
  async getAudioStreamUrl(consumableId: string): Promise<string> {
    const url = `https://api.storytel.net/assets/v2/consumables/${consumableId}/abook`;

    try {
      const bearer = await this.getApiBearer();
      const response = await this.client.get(url, {
        headers: {
          Authorization: `Bearer ${bearer}`,
          Accept: "*/*",
        },
      });
      // maxRedirects is 0 on the client, so a 2xx here is unexpected; prefer
      // the redirect Location captured below in the catch.
      return (
        (response.request as any)?.res?.responseUrl ||
        response.headers.location
      );
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      const location = error.response?.headers?.location;
      if (location) return location;
      throw new Error(`Failed to get audio stream URL: ${error.message}`);
    }
  }

  async getStreamUrl(bookId: string): Promise<string> {
    const url = `https://www.storytel.com/mp3streamRangeReq?startposition=0&programId=${bookId}&token=${encodeURIComponent(this.getLegacyActionToken())}`;

    try {
      const response = await this.client.get(url);
      return (
        (response.request as any).res.responseUrl || response.headers.location
      );
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      if (error.response && error.response.headers.location) {
        return error.response.headers.location;
      }
      throw new Error(`Failed to get stream URL: ${error.message}`);
    }
  }

  async getBookmark(consumableId: string): Promise<BookmarkResponse> {
    const url = `https://api.storytel.net/bookmarks/manual?type=abook&consumableId=${consumableId}`;

    try {
      const bearer = await this.getApiBearer();
      const response = await this.client.get<BookmarkResponse>(url, {
        headers: {
          Authorization: `Bearer ${bearer}`,
          Accept: "application/vnd.storytel.bookmark+json;v=2.0",
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to get bookmark: ${error.message}`);
    }
  }

  async setBookmark(
    consumableId: string,
    position: number,
    note: string,
  ): Promise<void> {
    const url = "https://api.storytel.net/bookmarks/manual";
    try {
      const bearer = await this.getApiBearer();
      await this.client.post(
        url,
        {
          position,
          consumableId,
          note,
          type: "abook",
        },
        {
          headers: {
            Authorization: `Bearer ${bearer}`,
            Accept: "application/vnd.storytel.bookmark+json;v=2.0",
          },
        },
      );
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to set bookmark: ${error.message}`);
    }
  }

  async updateBookmark(
    consumableId: string,
    bookmarkId: string,
    bookmarkData: any,
  ): Promise<void> {
    const { bookmarks } = await this.getBookmark(consumableId);

    if (
      !bookmarks ||
      !bookmarks.some((bookmark) => bookmark.id === bookmarkId)
    ) {
      throw new Error(`Failed to remove bookmark: bookmark does not exists!`);
    }

    const url = `https://api.storytel.net/bookmarks/manual/${bookmarkId}?id=${bookmarkId}`;
    try {
      const bearer = await this.getApiBearer();
      await this.client.put(url, bookmarkData, {
        headers: {
          Authorization: `Bearer ${bearer}`,
          Accept: "application/vnd.storytel.bookmark+json;v=2.0",
        },
      });
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to update bookmark: ${error.message}`);
    }
  }

  async deleteBookmark(
    consumableId: string,
    bookmarkId: string,
  ): Promise<void> {
    const { bookmarks } = await this.getBookmark(consumableId);

    if (
      !bookmarks ||
      !bookmarks.some((bookmark) => bookmark.id === bookmarkId)
    ) {
      throw new Error(`Failed to remove bookmark: bookmark does not exists!`);
    }

    const url = `https://api.storytel.net/bookmarks/manual/${bookmarkId}?id=${bookmarkId}`;
    try {
      const bearer = await this.getApiBearer();
      await this.client.delete(url, {
        headers: {
          Authorization: `Bearer ${bearer}`,
          Accept: "application/vnd.storytel.bookmark+json;v=2.0",
        },
      });
    } catch (error: any) {
      if (error.isStorytelUnauthorized) throw error;
      throw new Error(`Failed to delete bookmark: ${error.message}`);
    }
  }
}

export default StorytelClient;
