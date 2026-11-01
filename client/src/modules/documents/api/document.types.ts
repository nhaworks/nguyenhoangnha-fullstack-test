export type DocumentInfo = {
  id: string;
  templateId: string;
  templateName: string;
  type: string;
  title: string;
  editable: boolean;
  downloadUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentListItem = DocumentInfo & {
  thumbnailUrl: string | null;
};
