import type { ReactNode, RefObject } from 'react';
import { DocxEditor, type DocxEditorRef } from '@docx-editor.dev/react';
import './docx-editor.css';

type DocxEditorPaneProps = {
  fileContent: ArrayBuffer;
  title: string;
  editorRef: RefObject<DocxEditorRef | null>;
  titleBarLeft: ReactNode;
  titleBarRight: ReactNode;
  onChange: (change: { source?: string }) => void;
  onSave: () => void;
};

export function DocxEditorPane(props: DocxEditorPaneProps) {
  return (
    <DocxEditor
      ref={props.editorRef}
      document={props.fileContent}
      title={props.title}
      locale="vi-VN"
      renderTitleBarLeft={() => props.titleBarLeft}
      renderTitleBarRight={() => props.titleBarRight}
      onChange={props.onChange}
      onSave={props.onSave}
    />
  );
}
