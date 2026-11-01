export type Category = {
  id: string;
  name: string;
  description: string;
  total: number;
};

export type TemplateSummary = {
  id: string;
  type: string;
  name: string;
  description: string;
  category: { id: string; name: string };
  thumbnailUrl: string | null;
};

export type TemplatePreview = {
  position: number;
  url: string;
};

export type TemplateDetail = TemplateSummary & {
  fileUrl: string;
  previews: TemplatePreview[];
  createdAt: string;
  updatedAt: string;
};
