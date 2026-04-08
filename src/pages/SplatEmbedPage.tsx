import { useParams, useNavigate } from 'react-router-dom';
import { SPLATS } from '@/data/splats';
import { SplatViewer } from '@/components/SplatViewer';

const SplatEmbedPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const splatIndex = SPLATS.findIndex((s) => s.id === id);
  const splat = SPLATS[splatIndex];

  if (!splat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-4">Splat scene not found</p>
          <a href="/" className="text-blue-500 hover:text-blue-700 underline">
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  const onNext = splatIndex < SPLATS.length - 1
    ? () => navigate(`/embed/${SPLATS[splatIndex + 1].id}`)
    : undefined;

  const onPrev = splatIndex > 0
    ? () => navigate(`/embed/${SPLATS[splatIndex - 1].id}`)
    : undefined;

  return (
    <SplatViewer
      splat={splat}
      onClose={() => navigate('/')}
      onNext={onNext}
      onPrev={onPrev}
    />
  );
};

export default SplatEmbedPage;
