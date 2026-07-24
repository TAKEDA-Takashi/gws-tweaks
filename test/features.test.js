import { beforeAll, describe, expect, it } from 'vitest';

let FEATURES;
let loadFeatureSettings;

// loadFeatureSettingsが参照するchrome.storage.syncを保存値を差し替えて模擬する
function stubStoredFeatures(features) {
  globalThis.chrome = {
    storage: {
      sync: {
        get: async (defaults) => ({ ...defaults, features }),
      },
    },
  };
}

beforeAll(async () => {
  await import('../extension/src/lib/features.js');
  ({ FEATURES, loadFeatureSettings } = globalThis.GWSTweaks);
});

describe('markdownPasteShortcutのモード設定', () => {
  it('選択肢はauto・always・offの3つでデフォルトはauto', () => {
    const feature = FEATURES.find((f) => f.id === 'markdownPasteShortcut');
    expect(feature.options.map((o) => o.value)).toEqual(['auto', 'always', 'off']);
    expect(feature.defaultValue).toBe('auto');
  });

  it('未保存ならデフォルト（auto）を返す', async () => {
    stubStoredFeatures({});
    const settings = await loadFeatureSettings();
    expect(settings.markdownPasteShortcut).toBe('auto');
  });

  it('保存済みのモード値はそのまま返す', async () => {
    for (const mode of ['auto', 'always', 'off']) {
      stubStoredFeatures({ markdownPasteShortcut: mode });
      const settings = await loadFeatureSettings();
      expect(settings.markdownPasteShortcut).toBe(mode);
    }
  });

  it('旧バージョンのboolean値を引き継ぐ（true→auto、false→off）', async () => {
    stubStoredFeatures({ markdownPasteShortcut: true });
    expect((await loadFeatureSettings()).markdownPasteShortcut).toBe('auto');

    stubStoredFeatures({ markdownPasteShortcut: false });
    expect((await loadFeatureSettings()).markdownPasteShortcut).toBe('off');
  });

  it('不明な値はデフォルト（auto）に戻す', async () => {
    stubStoredFeatures({ markdownPasteShortcut: 'unknown' });
    expect((await loadFeatureSettings()).markdownPasteShortcut).toBe('auto');
  });
});

describe('ON/OFF機能の設定', () => {
  it('未保存ならdefaultEnabledで補完する', async () => {
    stubStoredFeatures({});
    const settings = await loadFeatureSettings();
    expect(settings.driveBreadcrumb).toBe(true);
    expect(settings.docSetup).toBe(true);
  });

  it('保存済みの値を優先する', async () => {
    stubStoredFeatures({ driveBreadcrumb: false });
    const settings = await loadFeatureSettings();
    expect(settings.driveBreadcrumb).toBe(false);
  });
});
