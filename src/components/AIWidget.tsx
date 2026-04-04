import { useRef, useState, useEffect } from 'react';

function buildDoc(html: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: transparent;
    font-family: system-ui, -apple-system, sans-serif;
    color: #d4d8e8;
    overflow: hidden;
    padding: 4px 0;
  }
</style>
</head>
<body>
${html}
<script>
  function reportHeight() {
    const h = document.body.scrollHeight;
    window.parent.postMessage({ type: 'wz-resize', height: h }, '*');
  }
  reportHeight();
  new MutationObserver(reportHeight).observe(document.body, {
    childList: true, subtree: true, attributes: true
  });
  window.addEventListener('load', reportHeight);
  setTimeout(reportHeight, 300);
  setTimeout(reportHeight, 800);
</script>
</body>
</html>`;
}

interface AIWidgetProps {
  html: string;
  id: string;
}

export function AIWidget({ html, id }: AIWidgetProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(80);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'wz-resize' && e.data?.height > 0) {
        setHeight(e.data.height + 8);
        setReady(true);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const srcDoc = buildDoc(html);

  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid hsl(220 15% 18%)',
        background: 'hsl(220 20% 6%)',
        margin: '10px 0',
        transition: 'height 0.3s ease',
        opacity: ready ? 1 : 0.3,
      }}
    >
      <iframe
        ref={iframeRef}
        id={id}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-same-origin"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="WeatherZA widget"
      />
    </div>
  );
}
