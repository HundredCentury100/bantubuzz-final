import { useState } from 'react';
import { Copy, Download, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { BASE_URL } from '../services/api';
import { downloadBlob, generateCreatorCardBlob } from '../utils/creatorCard';

const CreatorCardActions = ({ creator, compact = false }) => {
  const [busy, setBusy] = useState('');
  const profilePath = creator.profile_path || (creator.username ? `/${creator.username}` : `/creators/${creator.creator_id || creator.id}`);
  const profileUrl = `${window.location.origin}${profilePath}`;
  const imagePath = creator.profile_picture_sizes?.large
    || creator.profile_picture_sizes?.medium
    || creator.profile_picture;
  const imageUrl = imagePath
    ? (imagePath.startsWith('http') ? imagePath : `${BASE_URL}${imagePath}`)
    : null;
  const filename = `bantubuzz-${creator.username || creator.creator_id || creator.id}-creator-card.png`;

  const createCard = async () => generateCreatorCardBlob({ creator, imageUrl, profileUrl });

  const downloadCard = async (event) => {
    event?.stopPropagation();
    try {
      setBusy('download');
      const blob = await createCard();
      downloadBlob(blob, filename);
      toast.success('Creator Card downloaded');
    } catch {
      toast.error('Could not export Creator Card');
    } finally {
      setBusy('');
    }
  };

  const shareCard = async (event) => {
    event?.stopPropagation();
    try {
      setBusy('share');
      const blob = await createCard();
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${creator.display_name || creator.username} on BantuBuzz`,
          text: `View this creator on BantuBuzz: ${profileUrl}`,
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: `${creator.display_name || creator.username} on BantuBuzz`,
          text: `View this creator on BantuBuzz`,
          url: profileUrl,
        });
      } else {
        downloadBlob(blob, filename);
        toast.success('Creator Card downloaded for sharing');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error('Could not share Creator Card');
    } finally {
      setBusy('');
    }
  };

  const copyLink = async (event) => {
    event?.stopPropagation();
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast.success('Profile link copied');
    } catch {
      toast.error('Could not copy profile link');
    }
  };

  const buttonClass = compact
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-dark disabled:opacity-50'
    : 'inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-primary hover:text-dark disabled:opacity-50';

  return (
    <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={downloadCard} disabled={Boolean(busy)} className={buttonClass} title="Download Creator Card">
        <Download className="h-4 w-4" />
        {!compact && 'Export card'}
      </button>
      <button type="button" onClick={shareCard} disabled={Boolean(busy)} className={buttonClass} title="Share Creator Card">
        <Share2 className="h-4 w-4" />
        {!compact && 'Share card'}
      </button>
      <button type="button" onClick={copyLink} className={buttonClass} title="Copy profile link">
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
};

export default CreatorCardActions;
