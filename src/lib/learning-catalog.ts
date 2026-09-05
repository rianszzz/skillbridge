// Katalog materi terkurasi per kriteria. Setiap kriteria memiliki 2-3 resource.
// URL berasal dari sumber terkurasi yang sudah diperiksa keaktifannya.
// ponytail: static catalog, add DB + search when catalog exceeds ~50 items

export type LearningResource = { title: string; url: string; level: "beginner" | "intermediate"; language: "id" | "en" };

export const catalog: Record<string, LearningResource[]> = {
  // Informatika
  web_code_quality: [
    { title: "MDN: JavaScript Guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", level: "beginner", language: "en" },
    { title: "Clean Code JavaScript", url: "https://github.com/ryanmcdermott/clean-code-javascript", level: "intermediate", language: "en" },
    { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html", level: "beginner", language: "en" },
  ],
  web_project_structure: [
    { title: "Next.js Project Structure", url: "https://nextjs.org/docs/app/getting-started/project-structure", level: "beginner", language: "en" },
    { title: "Bulletproof React Architecture", url: "https://github.com/alan2207/bulletproof-react", level: "intermediate", language: "en" },
  ],
  web_documentation: [
    { title: "GitHub: About READMEs", url: "https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes", level: "beginner", language: "en" },
    { title: "Make a README", url: "https://www.makeareadme.com/", level: "beginner", language: "en" },
    { title: "Documentation Guide (Write the Docs)", url: "https://www.writethedocs.org/guide/writing/beginners-guide-to-docs/", level: "intermediate", language: "en" },
  ],
  web_contribution_history: [
    { title: "Git: Contributing to a Project", url: "https://git-scm.com/book/en/v2/Distributed-Git-Contributing-to-a-Project", level: "beginner", language: "en" },
    { title: "Conventional Commits", url: "https://www.conventionalcommits.org/", level: "intermediate", language: "en" },
  ],

  // DKV
  design_visual_consistency: [
    { title: "NNGroup: Visual Hierarchy", url: "https://www.nngroup.com/articles/visual-hierarchy-ux-definition/", level: "beginner", language: "en" },
    { title: "Material Design: Color System", url: "https://m3.material.io/styles/color/system/overview", level: "beginner", language: "en" },
    { title: "Typewolf: Font Pairing", url: "https://www.typewolf.com/google-fonts", level: "intermediate", language: "en" },
  ],
  design_process_iteration: [
    { title: "Design Council: Double Diamond", url: "https://www.designcouncil.org.uk/our-resources/the-double-diamond/", level: "beginner", language: "en" },
    { title: "Figma: Design Process", url: "https://www.figma.com/resource-library/design-process/", level: "beginner", language: "en" },
  ],
  design_narrative: [
    { title: "NNGroup: UX Portfolios", url: "https://www.nngroup.com/articles/ux-design-portfolios/", level: "beginner", language: "en" },
    { title: "UX Planet: Case Study Guide", url: "https://uxplanet.org/a-comprehensive-guide-to-ux-case-studies-6e72b861f4d", level: "intermediate", language: "en" },
  ],
  design_problem_solving: [
    { title: "IDEO: Design Thinking", url: "https://designthinking.ideo.com/", level: "beginner", language: "en" },
    { title: "NNGroup: Design Thinking 101", url: "https://www.nngroup.com/articles/design-thinking/", level: "beginner", language: "en" },
  ],

  // Marketing
  marketing_methodology: [
    { title: "Google: Digital Marketing Fundamentals", url: "https://skillshop.exceedlms.com/student/catalog/list?category_ids=53-google-ads", level: "beginner", language: "en" },
    { title: "HubSpot: Digital Marketing Course", url: "https://academy.hubspot.com/courses/digital-marketing", level: "beginner", language: "en" },
    { title: "Marketing Funnel Guide (HubSpot)", url: "https://blog.hubspot.com/marketing/marketing-funnel", level: "intermediate", language: "en" },
  ],
  marketing_data_use: [
    { title: "Google Analytics Academy", url: "https://skillshop.exceedlms.com/student/catalog/list?category_ids=540-google-analytics", level: "beginner", language: "en" },
    { title: "Google: Data Analytics Certificate", url: "https://grow.google/certificates/data-analytics/", level: "intermediate", language: "en" },
  ],
  marketing_measurable_results: [
    { title: "Google Ads: Measure Results", url: "https://support.google.com/google-ads/answer/1722022", level: "beginner", language: "en" },
    { title: "HubSpot: Marketing Metrics", url: "https://blog.hubspot.com/marketing/marketing-metrics", level: "beginner", language: "en" },
    { title: "KPI Examples (Klipfolio)", url: "https://www.klipfolio.com/resources/kpi-examples/digital-marketing", level: "intermediate", language: "en" },
  ],
  marketing_report_quality: [
    { title: "Looker Studio Fundamentals", url: "https://support.google.com/looker-studio/answer/6283323", level: "beginner", language: "en" },
    { title: "HubSpot: Marketing Report Templates", url: "https://blog.hubspot.com/marketing/marketing-report-examples", level: "intermediate", language: "en" },
  ],
};

/** Pick top resources for a set of gap criterion IDs, up to `limit` total */
export function recommendResources(gapCriterionIds: string[], limit = 3): { criterionId: string; resource: LearningResource }[] {
  const results: { criterionId: string; resource: LearningResource }[] = [];
  for (const criterionId of gapCriterionIds) {
    const items = catalog[criterionId];
    if (!items?.length) continue;
    results.push({ criterionId, resource: items[0] });
    if (results.length >= limit) break;
  }
  return results;
}
