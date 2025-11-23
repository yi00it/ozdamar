import * as fs from 'fs';
import * as path from 'path';

export class TemplateEngine {
  private templates: Map<string, string> = new Map();

  loadTemplate(name: string, templatesDir: string): void {
    const templatePath = path.join(templatesDir, `${name}.html`);
    const content = fs.readFileSync(templatePath, 'utf-8');
    this.templates.set(name, content);
  }

  loadXMLTemplate(name: string, templatesDir: string): void {
    const templatePath = path.join(templatesDir, `${name}.xml`);
    const content = fs.readFileSync(templatePath, 'utf-8');
    this.templates.set(name, content);
  }

  render(templateName: string, data: Record<string, string>): string {
    let template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      template = template.replace(new RegExp(placeholder, 'g'), value);
    }

    return template;
  }

  renderLayout(contentHtml: string, data: Record<string, string>): string {
    return this.render('layout', { ...data, content: contentHtml });
  }
}
