import { analyzeNestedStructures, extractVariables } from '../../src/diagnostics/variableAnalyzer';

describe('variableAnalyzer', () => {
  it('extracts used variables and normalizes dotted access', () => {
    const text = `
      <div>{{ user.name }}</div>
      <div>{{ user.email }}</div>
      {% set local = "ok" %}
      {% for item in items %}
        {{ item }}
      {% endfor %}
    `;

    const result = extractVariables(text);

    expect(result.usedVariables).toEqual(expect.arrayContaining(['user', 'item']));
    expect(result.setVariables).toEqual(expect.arrayContaining(['local', 'item']));
  });

  it('collects variables defined by nested for/set blocks', () => {
    const text = `
      {% if condition %}
        {% set feature = true %}
        {% for product in products %}
          {{ product.name }}
        {% endfor %}
      {% endif %}
    `;

    const result = analyzeNestedStructures(text);

    expect(result).toEqual(expect.arrayContaining(['feature', 'product']));
  });
});
