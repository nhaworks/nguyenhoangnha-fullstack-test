import type { ReactNode, RefObject } from 'react';
import { DocxEditor, type DocxEditorRef } from '@docx-editor.dev/react';
import { DownloadIcon } from '../../../shared/components/icons';
import './docx-editor.css';

type DocxEditorPaneProps = {
  fileContent: ArrayBuffer;
  title: string;
  onTitleChange: (title: string) => void;
  editorRef: RefObject<DocxEditorRef | null>;
  titleBarLeft: ReactNode;
  onChange: (change: { source?: string }) => void;
  onSave: () => void;
  onDownload: () => void;
};

export function DocxEditorPane(props: DocxEditorPaneProps) {
  const fileMenu = (
    <DocxEditor.Menu.File preset={false}>
      <DocxEditor.Menu.Open />
      <DocxEditor.Menu.Save />
      <DocxEditor.Menu.Separator />
      <DocxEditor.Menu.Submenu labelKey="toolbar.export">
        <DocxEditor.Menu.Row icon={<DownloadIcon className="size-4" />} onSelect={props.onDownload}>
          Word (.docx)
        </DocxEditor.Menu.Row>
      </DocxEditor.Menu.Submenu>
      <DocxEditor.Menu.PageSetup />
    </DocxEditor.Menu.File>
  );

  return (
    <DocxEditor
      ref={props.editorRef}
      document={props.fileContent}
      title={props.title}
      onTitleChange={props.onTitleChange}
      locale="vi-VN"
      menu={{ children: fileMenu }}
      renderTitleBarLeft={() => props.titleBarLeft}
      onChange={props.onChange}
      onSave={props.onSave}
    />
  );
}
