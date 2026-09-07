type CopyFrame = {
  frame: HTMLIFrameElement;
  document: Document;
  holder: HTMLDivElement;
};

/**
 * Build the legacy rich-text clipboard selection in an isolated white document.
 * Some browsers include computed ancestor backgrounds when copying a DOM range;
 * selecting from the application document would therefore leak the studio's
 * beige canvas into every paragraph pasted into the WeChat editor.
 */
export function createRichTextCopyFrame(ownerDocument: Document, html: string): CopyFrame {
  const frame = ownerDocument.createElement('iframe');
  frame.title = '富文本复制缓冲区';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
  ownerDocument.body.appendChild(frame);

  const copyDocument = frame.contentDocument;
  if (!copyDocument) {
    frame.remove();
    throw new Error('无法创建富文本复制环境');
  }

  copyDocument.documentElement.style.cssText = 'margin:0;padding:0;background-color:#ffffff;color-scheme:light;';
  copyDocument.body.style.cssText = 'margin:0;padding:0;background-color:#ffffff;color:#000000;color-scheme:light;';
  const holder = copyDocument.createElement('div');
  holder.contentEditable = 'true';
  holder.style.cssText = 'margin:0;padding:0;background-color:#ffffff;color-scheme:light;';
  holder.innerHTML = html;
  copyDocument.body.appendChild(holder);

  return { frame, document: copyDocument, holder };
}

export function copyRichTextFallback(html: string, ownerDocument: Document = document): boolean {
  const copyFrame = createRichTextCopyFrame(ownerDocument, html);
  try {
    const range = copyFrame.document.createRange();
    range.selectNodeContents(copyFrame.holder);
    const selection = copyFrame.document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    // Legacy fallback for browsers without the asynchronous Clipboard API.
    // oxlint-disable-next-line typescript/no-deprecated
    return copyFrame.document.execCommand('copy');
  } finally {
    copyFrame.frame.remove();
  }
}
