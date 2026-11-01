export type DocTypeOption = {
  code: string;
  label: string;
  pageUnit: string;
  libraryTitle: string;
  description: string;
  searchPlaceholder: string;
};

export const DOC_TYPES: DocTypeOption[] = [
  {
    code: 'docx',
    label: 'Văn bản',
    pageUnit: 'trang',
    libraryTitle: 'Mẫu tài liệu ',
    description: '',
    searchPlaceholder: 'Tìm mẫu docx',
  },
  {
    code: 'pptx',
    label: 'Trình chiếu',
    pageUnit: 'slide',
    libraryTitle: 'Kho mẫu trình chiếu',
    description: '',
    searchPlaceholder: 'Tìm mẫu pptx',
  },
];

export function findDocType(code: string): DocTypeOption {
  return DOC_TYPES.find((docType) => docType.code === code) || DOC_TYPES[0];
}
