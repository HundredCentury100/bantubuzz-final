const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});

const roundRect = (context, x, y, width, height, radius) => {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.closePath();
};

const formatFollowers = (value) => new Intl.NumberFormat('en', {
  notation: Number(value) >= 10000 ? 'compact' : 'standard',
  maximumFractionDigits: 1,
}).format(Number(value) || 0);

const fitText = (value, maxLength) => {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
};

export async function generateCreatorCardBlob({
  creator,
  imageUrl,
  profileUrl,
}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext('2d');

  context.fillStyle = '#f7f9ef';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#1f2937';
  context.fillRect(0, 0, canvas.width, 170);
  context.fillStyle = '#ccdb53';
  context.fillRect(0, 170, canvas.width, 18);

  context.fillStyle = '#ccdb53';
  context.font = '700 42px Poppins, Arial, sans-serif';
  context.fillText('BantuBuzz', 72, 103);
  context.fillStyle = '#ffffff';
  context.font = '500 25px Poppins, Arial, sans-serif';
  context.fillText('Creator Leaderboard', 790, 100);

  const photoX = 340;
  const photoY = 245;
  const photoSize = 400;
  context.save();
  context.beginPath();
  context.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = '#e5e7eb';
  context.fillRect(photoX, photoY, photoSize, photoSize);
  let photoDrawn = false;
  if (imageUrl) {
    try {
      const image = await loadImage(imageUrl);
      const scale = Math.max(photoSize / image.width, photoSize / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(
        image,
        photoX + (photoSize - width) / 2,
        photoY + (photoSize - height) / 2,
        width,
        height,
      );
      photoDrawn = true;
    } catch {
      photoDrawn = false;
    }
  }
  if (!photoDrawn) {
    context.fillStyle = '#838a36';
    context.font = '700 140px Poppins, Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText((creator.display_name || creator.username || 'C').slice(0, 1).toUpperCase(), 540, 500);
  }
  context.restore();
  context.strokeStyle = '#ccdb53';
  context.lineWidth = 18;
  context.beginPath();
  context.arc(540, photoY + photoSize / 2, photoSize / 2 + 7, 0, Math.PI * 2);
  context.stroke();

  context.textAlign = 'center';
  context.fillStyle = '#1f2937';
  context.font = '700 58px Poppins, Arial, sans-serif';
  context.fillText(fitText(creator.display_name || creator.username || 'Creator', 27), 540, 740);

  const rank = creator.overall_rank?.position || creator.rank;
  if (rank) {
    context.fillStyle = '#ccdb53';
    roundRect(context, 330, 785, 420, 90, 14);
    context.fill();
    context.fillStyle = '#1f2937';
    context.font = '700 38px Poppins, Arial, sans-serif';
    context.fillText(`Ranked #${rank} Overall`, 540, 843);
  }

  const statsY = 930;
  const statWidth = 410;
  [
    {
      x: 90,
      label: 'Category',
      value: fitText(creator.category || creator.categories?.[0] || 'Creator', 20),
    },
    {
      x: 580,
      label: creator.platform ? `${creator.platform} followers` : 'Followers',
      value: formatFollowers(creator.platform_followers || creator.follower_count),
    },
  ].forEach((stat) => {
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#d1d5db';
    context.lineWidth = 2;
    roundRect(context, stat.x, statsY, statWidth, 165, 12);
    context.fill();
    context.stroke();
    context.fillStyle = '#6b7280';
    context.font = '500 24px Poppins, Arial, sans-serif';
    context.fillText(stat.label, stat.x + statWidth / 2, statsY + 52);
    context.fillStyle = '#1f2937';
    context.font = '700 36px Poppins, Arial, sans-serif';
    context.fillText(String(stat.value), stat.x + statWidth / 2, statsY + 112);
  });

  context.fillStyle = '#374151';
  context.font = '500 23px Poppins, Arial, sans-serif';
  context.fillText(profileUrl, 540, 1190);
  context.fillStyle = '#838a36';
  context.font = '700 28px Poppins, Arial, sans-serif';
  context.fillText('Discover and book African creator talent', 540, 1260);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not generate creator card'));
    }, 'image/png');
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
