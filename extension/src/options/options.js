(function () {
  'use strict';

  const {
    FEATURES,
    loadFeatureSettings,
    saveFeatureSettings,
    loadDocSetupSettings,
    saveDocSetupSettings,
  } = globalThis.GWSTweaks;

  async function renderFeatures() {
    const settings = await loadFeatureSettings();
    const list = document.getElementById('feature-list');

    for (const feature of FEATURES) {
      const item = document.createElement('li');

      const label = document.createElement('label');
      label.htmlFor = feature.id;

      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = feature.name;

      const description = document.createElement('div');
      description.className = 'description';
      description.textContent = feature.description;

      label.append(name, description);

      if (feature.options) {
        // 選択式の機能はチェックボックスの代わりにプルダウンを説明の下に置く
        const select = document.createElement('select');
        select.id = feature.id;
        for (const option of feature.options) {
          const el = document.createElement('option');
          el.value = option.value;
          el.textContent = option.label;
          select.append(el);
        }
        select.value = settings[feature.id];
        select.addEventListener('change', async () => {
          settings[feature.id] = select.value;
          await saveFeatureSettings(settings);
        });
        label.append(select);
        item.append(label);
      } else {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = feature.id;
        checkbox.checked = settings[feature.id];
        checkbox.addEventListener('change', async () => {
          settings[feature.id] = checkbox.checked;
          await saveFeatureSettings(settings);
        });
        item.append(checkbox, label);
      }
      list.append(item);
    }
  }

  async function renderDocSetup() {
    const settings = await loadDocSetupSettings();
    const fontFamily = document.getElementById('doc-setup-font-family');
    const fontSize = document.getElementById('doc-setup-font-size');
    const lineSpacing = document.getElementById('doc-setup-line-spacing');
    const indentUnit = document.getElementById('doc-setup-indent-unit');
    const pageless = document.getElementById('doc-setup-pageless');

    fontFamily.value = settings.fontFamily;
    fontSize.value = settings.fontSize == null ? '' : String(settings.fontSize);
    lineSpacing.value = settings.lineSpacing == null ? '' : String(settings.lineSpacing);
    indentUnit.value = settings.indentUnit == null ? '' : String(settings.indentUnit);
    pageless.checked = settings.pageless;

    async function save() {
      await saveDocSetupSettings({
        fontFamily: fontFamily.value.trim(),
        fontSize: fontSize.value === '' ? null : Number(fontSize.value),
        lineSpacing: lineSpacing.value === '' ? null : Number(lineSpacing.value),
        indentUnit: indentUnit.value === '' ? null : Number(indentUnit.value),
        pageless: pageless.checked,
      });
    }

    for (const el of [fontFamily, fontSize, lineSpacing, indentUnit, pageless]) {
      el.addEventListener('change', save);
    }
  }

  renderFeatures();
  renderDocSetup();
})();
