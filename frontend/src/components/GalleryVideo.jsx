import { useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const GalleryVideo = ({
  src,
  type = 'video/mp4',
  className = '',
  autoPlay = true,
  loop = true,
  showBadge = true,
  badgeClassName = 'absolute top-3 left-3 bg-black/60 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1',
  soundButtonClassName = 'absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/85 transition-colors'
}) => {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);

  const toggleMute = async (event) => {
    event.stopPropagation();

    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);

    if (!nextMuted) {
      try {
        await video.play();
      } catch (error) {
        video.muted = true;
        setIsMuted(true);
      }
    }
  };

  return (
    <>
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        muted={isMuted}
        loop={loop}
        playsInline
        className={className}
      >
        <source src={src} type={type} />
      </video>

      {showBadge && (
        <div className={badgeClassName}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
          Video
        </div>
      )}

      <button
        type="button"
        onClick={toggleMute}
        className={soundButtonClassName}
        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        title={isMuted ? 'Unmute video' : 'Mute video'}
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </>
  );
};

export default GalleryVideo;
