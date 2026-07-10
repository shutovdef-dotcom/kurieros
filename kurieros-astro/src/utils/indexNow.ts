const INDEXNOW_KEY = /^[A-Za-z0-9-]{8,128}$/;

export type IndexNowNotification = {
  endpoint: URL;
  payload: {
    host: string;
    key: string;
    keyLocation: string;
    urlList: [string];
  };
};

/** Builds a single-URL IndexNow request; publication code must never batch drafts. */
export const buildSingleUrlIndexNowNotification = ({
  url,
  key,
  host = 'kurerok.ru',
}: {
  url: string;
  key: string;
  host?: string;
}): IndexNowNotification => {
  if (!INDEXNOW_KEY.test(key)) {
    throw new Error('IndexNow key must be 8–128 letters, digits, or dashes.');
  }
  const normalizedHost = host.toLowerCase();
  const pageUrl = new URL(url);
  if (pageUrl.protocol !== 'https:' || pageUrl.hostname.toLowerCase() !== normalizedHost) {
    throw new Error('IndexNow URL must be an HTTPS URL on the verified host.');
  }

  return {
    endpoint: new URL('https://api.indexnow.org/indexnow'),
    payload: {
      host: normalizedHost,
      key,
      keyLocation: `https://${normalizedHost}/${key}.txt`,
      urlList: [pageUrl.toString()],
    },
  };
};
