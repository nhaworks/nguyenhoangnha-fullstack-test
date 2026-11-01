import { lazy, Suspense } from 'react';
import { SpinnerIcon } from '../../../shared/components/icons';
import { StatusView } from '../../../shared/components/StatusView';
import { Toast } from '../../../shared/components/Toast';
import { DocumentDetailHeader } from '../components/DocumentDetailHeader';
import { EditorActions, EditorBackButton } from '../components/EditorTitleBar';
import { SlidePreviewPane } from '../components/SlidePreviewPane';
import { useDocumentRoute } from '../hooks/useDocumentRoute';
import { useOpenedDocument } from '../hooks/useOpenedDocument';

const DocxEditorPane = lazy(() =>
  import('../components/DocxEditorPane').then((module) => ({ default: module.DocxEditorPane })),
);

export function DocumentDetailPage() {
  const route = useDocumentRoute();
  const opened = useOpenedDocument(route.documentId, route.backToList);
  const document = opened.document;

  if (opened.status === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-xl">
          <StatusView
            type="error"
            title="Không mở được tài liệu"
            description={opened.error}
            actionLabel="Quay lại danh sách"
            onAction={() => route.backToList('')}
          />
        </div>
      </div>
    );
  }

  if (opened.status === 'loading' || !document) {
    return <FullScreenSpinner />;
  }

  const editorActions = (
    <EditorActions
      saveLabel={opened.saveLabel}
      canSave={opened.canSave}
      onSave={opened.save}
      onDownload={opened.download}
    />
  );

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900">
      {document.editable && opened.fileContent ? (
        <Suspense fallback={<FullScreenSpinner />}>
          <DocxEditorPane
            fileContent={opened.fileContent}
            title={document.title}
            editorRef={opened.editorRef}
            titleBarLeft={<EditorBackButton onBack={opened.leave} />}
            titleBarRight={editorActions}
            onChange={opened.handleEditorChange}
            onSave={opened.save}
          />
        </Suspense>
      ) : (
        <>
          <DocumentDetailHeader
            title={document.title}
            fileTypeLabel={document.fileTypeLabel}
            statusText={document.statusText}
            statusHint={`Từ mẫu ${document.templateName}`}
            onBack={opened.leave}
            onDownload={opened.download}
          />
          <p className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-800">
            Chưa hỗ trợ chỉnh sửa trình chiếu trực tuyến. Tải xuống để mở bằng PowerPoint hoặc LibreOffice Impress.
          </p>
          <div className="min-h-0 flex-1">
            <SlidePreviewPane templateId={document.templateId} title={document.title} />
          </div>
        </>
      )}

      <Toast toast={opened.toast} onClose={opened.closeToast} />
    </div>
  );
}

function FullScreenSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-100 text-violet-600">
      <SpinnerIcon className="size-10" />
    </div>
  );
}
