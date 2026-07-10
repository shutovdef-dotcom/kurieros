import { describe, expect, it } from 'vitest';
import { buildSingleUrlIndexNowNotification } from '../src/utils/indexNow';

describe('IndexNow release notification', () => {
  it('makes one canonical published URL and a root ownership-file location', () => {
    expect(buildSingleUrlIndexNowNotification({
      url: 'https://kurerok.ru/blog/test-article/',
      key: 'abcD-1234',
    })).toEqual({
      endpoint: new URL('https://api.indexnow.org/indexnow'),
      payload: {
        host: 'kurerok.ru',
        key: 'abcD-1234',
        keyLocation: 'https://kurerok.ru/abcD-1234.txt',
        urlList: ['https://kurerok.ru/blog/test-article/'],
      },
    });
  });

  it('rejects off-host, non-HTTPS, and invalid-key notifications', () => {
    expect(() => buildSingleUrlIndexNowNotification({
      url: 'https://example.test/blog/test-article/', key: 'abcD-1234',
    })).toThrow(/verified host/);
    expect(() => buildSingleUrlIndexNowNotification({
      url: 'http://kurerok.ru/blog/test-article/', key: 'abcD-1234',
    })).toThrow(/HTTPS/);
    expect(() => buildSingleUrlIndexNowNotification({
      url: 'https://kurerok.ru/blog/test-article/', key: 'short',
    })).toThrow(/8–128/);
  });
});
