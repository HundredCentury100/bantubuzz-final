/**
 * Message Safety Utility Functions
 * Detects harmful language and contact sharing attempts
 */

/**
 * Check if message contains harmful language
 * @param {string} message - The message text to check
 * @returns {object} - { detected: boolean, patterns: array, type: string }
 */
export const checkHarmfulLanguage = (message) => {
  if (!message || typeof message !== 'string') {
    return { detected: false, patterns: [], type: 'harmful_language' };
  }

  const messageLower = message.toLowerCase();

  // Harmful language patterns
  const harmfulPatterns = {
    violence: ['kill', 'murder', 'hurt', 'attack', 'beat up', 'bomb', 'shoot', 'stab', 'die'],
    threats: ['i will kill', 'i will hurt', 'watch out', "you'll regret", 'find you', 'come for you'],
    harassment: ['rape', 'assault', 'molest', 'harass'],
    hate: ['hate you', 'wish you were dead']
  };

  const detectedPatterns = [];

  // Check each category
  for (const [category, patterns] of Object.entries(harmfulPatterns)) {
    for (const pattern of patterns) {
      if (messageLower.includes(pattern)) {
        detectedPatterns.push(pattern);
      }
    }
  }

  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    type: 'harmful_language'
  };
};

/**
 * Check if message contains contact sharing attempts
 * @param {string} message - The message text to check
 * @returns {object} - { detected: boolean, patterns: array, type: string }
 */
export const checkContactSharing = (message) => {
  if (!message || typeof message !== 'string') {
    return { detected: false, patterns: [], type: 'contact_sharing' };
  }

  const detectedPatterns = [];

  // Phone number patterns
  const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  if (phonePattern.test(message)) {
    detectedPatterns.push('phone number');
  }

  // Email pattern
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailPattern.test(message)) {
    detectedPatterns.push('email address');
  }

  // External platform mentions
  const externalPlatforms = [
    'whatsapp', 'watsapp', 'whatsapp me', 'wa.me',
    'telegram', 'text me', 'call me',
    'dm me on instagram', 'dm me on facebook',
    'add me on snapchat', 'snapchat me'
  ];

  const messageLower = message.toLowerCase();
  for (const platform of externalPlatforms) {
    if (messageLower.includes(platform)) {
      detectedPatterns.push(platform);
    }
  }

  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    type: 'contact_sharing'
  };
};

/**
 * Check message safety (combines both checks)
 * @param {string} message - The message text to check
 * @returns {object} - { needsWarning: boolean, warningType: string, patterns: array }
 */
export const checkMessageSafety = (message) => {
  // Check harmful language first (higher priority)
  const harmfulCheck = checkHarmfulLanguage(message);
  if (harmfulCheck.detected) {
    return {
      needsWarning: true,
      warningType: 'harmful_language',
      patterns: harmfulCheck.patterns
    };
  }

  // Check contact sharing
  const contactCheck = checkContactSharing(message);
  if (contactCheck.detected) {
    return {
      needsWarning: true,
      warningType: 'contact_sharing',
      patterns: contactCheck.patterns
    };
  }

  return {
    needsWarning: false,
    warningType: null,
    patterns: []
  };
};

/**
 * Get warning message based on type
 * @param {string} warningType - Type of warning
 * @returns {object} - Warning configuration
 */
export const getWarningConfig = (warningType) => {
  const configs = {
    harmful_language: {
      title: 'This message may violate community standards',
      description: 'Your message contains language that could be harmful or abusive.',
      icon: '⚠️',
      color: 'red'
    },
    contact_sharing: {
      title: 'For your safety, keep communication on BantuBuzz',
      description: 'Sharing contact details may remove payment protection and void dispute support.',
      icon: '🛡️',
      color: 'yellow'
    }
  };

  return configs[warningType] || configs.harmful_language;
};
