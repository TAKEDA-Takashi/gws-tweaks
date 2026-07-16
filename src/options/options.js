(function () {
  'use strict';

  const { FEATURES, loadFeatureSettings, saveFeatureSettings } = globalThis.GDocsTweaks;

  async function render() {
    const settings = await loadFeatureSettings();
    const list = document.getElementById('feature-list');

    for (const feature of FEATURES) {
      const item = document.createElement('li');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = feature.id;
      checkbox.checked = settings[feature.id];
      checkbox.addEventListener('change', async () => {
        settings[feature.id] = checkbox.checked;
        await saveFeatureSettings(settings);
      });

      const label = document.createElement('label');
      label.htmlFor = feature.id;

      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = feature.name;

      const description = document.createElement('div');
      description.className = 'description';
      description.textContent = feature.description;

      label.append(name, description);
      item.append(checkbox, label);
      list.append(item);
    }
  }

  render();
})();
