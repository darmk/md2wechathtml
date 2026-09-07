'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { extractOutline, mapScrollPosition, previewGeometry } from '@/lib/workspace-tools';

export function useWorkspaceView(markdown: string, html: string, desktop: boolean, original: boolean, enabled = true) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(760);
  const [paperHeight, setPaperHeight] = useState(800);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const outline = useMemo(() => extractOutline(markdown), [markdown]);
  const geometry = previewGeometry(availableWidth, original, desktop);
  const metrics = useRef({ editor: [] as number[], preview: [] as number[] });
  const expected = useRef<{ editor: number | null; preview: number | null }>({ editor: null, preview: null });
  const savedPosition = useRef({ editor: 0, preview: 0, selectionStart: 0, selectionEnd: 0, pageY: 0 });

  useEffect(() => {
    const editor = editorRef.current;
    const scroll = scrollRef.current;
    const paper = paperRef.current;
    if (!enabled || !editor || !scroll || !paper) return;
    let frame = 0;
    const measure = () => {
      const padding = getComputedStyle(scroll);
      setAvailableWidth(Math.max(1, scroll.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight)));
      setPaperHeight(paper.offsetHeight);
      const headingElements = Array.from(previewRef.current?.querySelectorAll<HTMLElement>('[data-outline-index]') ?? []);
      metrics.current.preview = outline.map((heading) => {
        const element = headingElements.find((node) => Number(node.dataset.outlineIndex) === heading.index);
        return element ? element.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop : 0;
      });
      if (!editor.clientWidth) return;
      // Mirror actual textarea wrapping instead of estimating positions from line counts.
      const mirror = document.createElement('div');
      const style = getComputedStyle(editor);
      mirror.style.cssText = `position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;width:${editor.clientWidth}px;white-space:pre-wrap;overflow-wrap:break-word;box-sizing:border-box;`;
      for (const property of ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'tab-size', 'word-break']) {
        mirror.style.setProperty(property, style.getPropertyValue(property));
      }
      let cursor = 0;
      const markers = outline.map((heading) => {
        mirror.appendChild(document.createTextNode(markdown.slice(cursor, heading.offset)));
        const marker = document.createElement('span');
        marker.textContent = markdown[heading.offset] || '\u200b';
        mirror.appendChild(marker);
        cursor = heading.offset + 1;
        return marker;
      });
      mirror.appendChild(document.createTextNode(markdown.slice(cursor) + '\n'));
      document.body.appendChild(mirror);
      metrics.current.editor = markers.map((marker) => marker.getBoundingClientRect().top - mirror.getBoundingClientRect().top);
      mirror.remove();
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(editor); observer.observe(scroll); observer.observe(paper);
    schedule();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [markdown, html, outline, geometry.scale, geometry.width, enabled]);

  function scrollTo(side: 'editor' | 'preview', top: number) {
    const element = side === 'editor' ? editorRef.current : scrollRef.current;
    if (!element || !element.clientWidth) return;
    const next = Math.max(0, Math.min(top, element.scrollHeight - element.clientHeight));
    if (Math.abs(element.scrollTop - next) < 1) return;
    expected.current[side] = next;
    element.scrollTop = next;
  }

  function onScroll(side: 'editor' | 'preview') {
    if (!enabled) return;
    const element = side === 'editor' ? editorRef.current : scrollRef.current;
    if (!element) return;
    const anticipated = expected.current[side];
    expected.current[side] = null;
    if (anticipated !== null && Math.abs(element.scrollTop - anticipated) < 2) return;
    const current = metrics.current[side];
    let active = -1;
    current.forEach((top, index) => { if (top <= element.scrollTop + 40) active = index; });
    setActiveIndex(active);
    if (!syncEnabled || !editorRef.current?.clientWidth || !scrollRef.current?.clientWidth) return;
    const editorMax = Math.max(0, editorRef.current.scrollHeight - editorRef.current.clientHeight);
    const previewMax = Math.max(0, scrollRef.current.scrollHeight - scrollRef.current.clientHeight);
    const editorAnchors = [0]; const previewAnchors = [0];
    metrics.current.editor.forEach((top, index) => {
      const e = Math.min(editorMax, Math.max(0, top - 20));
      const p = Math.min(previewMax, Math.max(0, (metrics.current.preview[index] ?? 0) - 20));
      if (e > editorAnchors[editorAnchors.length - 1] && p > previewAnchors[previewAnchors.length - 1]) {
        editorAnchors.push(e); previewAnchors.push(p);
      }
    });
    editorAnchors.push(editorMax); previewAnchors.push(previewMax);
    const from = side === 'editor' ? editorAnchors : previewAnchors;
    const to = side === 'editor' ? previewAnchors : editorAnchors;
    scrollTo(side === 'editor' ? 'preview' : 'editor', mapScrollPosition(element.scrollTop, from, to));
  }

  function locateHeading(index: number, focusEditor = false) {
    const heading = outline[index];
    if (!heading) return;
    setActiveIndex(index);
    const editor = editorRef.current;
    if (editor?.clientWidth) {
      if (focusEditor) {
        editor.focus({ preventScroll: true });
        const end = markdown.indexOf('\n', heading.offset);
        editor.setSelectionRange(heading.offset, end < 0 ? markdown.length : end);
      }
      scrollTo('editor', (metrics.current.editor[index] ?? 0) - 20);
    }
    scrollTo('preview', (metrics.current.preview[index] ?? 0) - 20);
  }

  function capturePosition() {
    savedPosition.current = { editor: editorRef.current?.scrollTop ?? 0, preview: scrollRef.current?.scrollTop ?? 0, selectionStart: editorRef.current?.selectionStart ?? 0, selectionEnd: editorRef.current?.selectionEnd ?? 0, pageY: window.scrollY };
  }
  function restorePosition() {
    const saved = savedPosition.current;
    editorRef.current?.setSelectionRange(saved.selectionStart, saved.selectionEnd);
    scrollTo('editor', saved.editor);
    scrollTo('preview', saved.preview);
    window.scrollTo({ top: saved.pageY, behavior: 'instant' });
  }

  return { editorRef, previewRef, scrollRef, paperRef, outline, activeIndex, syncEnabled, setSyncEnabled, geometry, paperHeight, onScroll, locateHeading, capturePosition, restorePosition };
}
