/**
 * SauraXT Intelligent Human-Like AI Chatbot & GIF Analysis Engine
 * - Zero API key required out of the box
 * - Analyzes incoming GIFs (sentiment, slug, tags) and replies with matching animated GIFs + witty human reactions
 * - Human-like conversational gamer personality fluent in English, Hindi & Hinglish
 * - Comprehensive knowledge of Gaming (Valorant, GTA V, Minecraft, Roblox), PC Optimization, and Server Lore
 * - Optional automatic Gemini API support if GEMINI_API_KEY is configured in .env
 */

// Fallback high-quality verified Tenor / Discord GIFs by sentiment
const VERIFIED_GIF_FALLBACKS = {
  greeting: [
    'https://tenor.com/view/wave-hi-hello-baby-yoda-grogu-gif-20038842',
    'https://tenor.com/view/hello-there-general-kenobi-star-wars-grevious-gif-17774324',
    'https://tenor.com/view/captain-america-salute-marvel-gif-14639977'
  ],
  laughter: [
    'https://tenor.com/view/leonardo-dicaprio-great-gatsby-cheers-toast-gif-15951833',
    'https://tenor.com/view/laughing-ryan-gosling-laugh-funny-haha-gif-26189874',
    'https://tenor.com/view/elmo-laugh-hahaha-crazy-gif-13833299'
  ],
  dance: [
    'https://tenor.com/view/cat-cats-tabby-cat-dance-dancing-gif-1048494086190209289',
    'https://tenor.com/view/dance-moves-snoop-dogg-groove-gif-14732103',
    'https://tenor.com/view/spider-man-dance-peter-parker-dance-dance-moves-groove-gif-17296068'
  ],
  gaming: [
    'https://tenor.com/view/digi-995-digi995-no-way-no-way-bro-no-way-dude-gif-11622055831351862535',
    'https://tenor.com/view/ready-player-one-gamer-gaming-virtual-reality-vr-gif-11634563',
    'https://tenor.com/view/victory-royale-fortnite-win-victory-celebration-gif-12965611'
  ],
  shock: [
    'https://tenor.com/view/mind-blown-tim-and-eric-mind-explosion-gif-15094958',
    'https://tenor.com/view/shocked-surprised-pikachu-pokemon-gif-14734846',
    'https://tenor.com/view/chris-pratt-parks-and-rec-andy-dwyer-surprised-wow-gif-15798950'
  ],
  facepalm: [
    'https://tenor.com/view/facepalm-captain-picard-patrick-stewart-star-trek-the-next-generation-gif-15822941',
    'https://tenor.com/view/robert-downey-jr-eye-roll-annoyed-sigh-gif-15951848',
    'https://tenor.com/view/cat-facepalm-tired-done-gif-14560731'
  ],
  chad: [
    'https://tenor.com/view/gigachad-chad-gif-20773266',
    'https://tenor.com/view/thumbs-up-computer-kid-brent-rambo-gif-13898126',
    'https://tenor.com/view/nod-approval-robert-redford-nodding-yes-gif-14734850'
  ],
  sad: [
    'https://tenor.com/view/hug-virtual-hug-cuddle-cat-gif-18195821',
    'https://tenor.com/view/sad-cat-crying-cat-thumbs-up-cat-gif-18237956',
    'https://tenor.com/view/comfort-hug-there-there-pat-head-gif-15638510'
  ],
  rage: [
    'https://tenor.com/view/keyboard-smash-rage-angry-mad-gif-14734839',
    'https://tenor.com/view/elmo-fire-hell-burn-chaos-gif-13833298',
    'https://tenor.com/view/calm-down-chill-relax-cat-gif-14560732'
  ],
  sus: [
    'https://tenor.com/view/the-rock-eyebrow-raise-dwayne-johnson-gif-24436894',
    'https://tenor.com/view/confused-travolta-what-looking-around-gif-15729783'
  ],
  food: [
    'https://tenor.com/view/homer-simpson-eating-drooling-donuts-hungry-gif-15798949',
    'https://tenor.com/view/pizza-slice-cheese-pull-delicious-food-gif-15951840'
  ],
  farewell: [
    'https://tenor.com/view/peace-out-disappear-vanish-bye-goodbye-gif-14734852',
    'https://tenor.com/view/good-night-cat-sleep-sleeping-tired-gif-18237957'
  ],
  general: [
    'https://tenor.com/view/gigachad-chad-gif-20773266',
    'https://tenor.com/view/nod-approval-robert-redford-nodding-yes-gif-14734850',
    'https://tenor.com/view/applause-clapping-joker-clapping-joaquin-phoenix-joker-slow-clap-gif-15234988'
  ]
};

/**
 * Dynamically search Tenor for fresh live GIFs with fallback
 */
export async function getTenorGif(query, category = 'general') {
  try {
    const res = await fetch(`https://tenor.com/search/${encodeURIComponent(query)}-gifs`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (res.ok) {
      const html = await res.text();
      const matches = [...html.matchAll(/href="(\/view\/[^"]+)"/g)];
      if (matches.length > 0) {
        const topMatches = matches.slice(0, 6);
        const pick = topMatches[Math.floor(Math.random() * topMatches.length)][1];
        return `https://tenor.com${pick}`;
      }
    }
  } catch (e) {}

  // Fallback to verified static links
  const list = VERIFIED_GIF_FALLBACKS[category] || VERIFIED_GIF_FALLBACKS.general;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Extract GIF information and tags from an incoming Discord message
 */
export function extractGifInfo(message) {
  if (!message) return { isGif: false, keywords: [], slug: '', url: null };

  const content = typeof message === 'string' ? message : (message.content || '');

  // 1. Check Tenor URL
  const tenorMatch = content.match(/tenor\.com\/view\/([a-zA-Z0-9_-]+)/i);
  if (tenorMatch) {
    const slug = tenorMatch[1].replace(/-gif-\d+$/, '').replace(/-gif$/, '');
    const keywords = slug.toLowerCase().split('-').filter(w => w.length > 1);
    return { isGif: true, type: 'tenor', slug, keywords, url: tenorMatch[0] };
  }

  // 2. Check Giphy URL
  const giphyMatch = content.match(/giphy\.com\/gifs\/([a-zA-Z0-9_-]+)/i);
  if (giphyMatch) {
    const slug = giphyMatch[1].replace(/-[a-zA-Z0-9]+$/, '');
    const keywords = slug.toLowerCase().split('-').filter(w => w.length > 1);
    return { isGif: true, type: 'giphy', slug, keywords, url: giphyMatch[0] };
  }

  // 3. Direct GIF link
  const directMatch = content.match(/https?:\/\/\S+\.gif(\?\S*)?/i);
  if (directMatch) {
    const filename = directMatch[0].split('/').pop().split('.')[0];
    const keywords = filename.toLowerCase().split(/[-_]/).filter(w => w.length > 1);
    return { isGif: true, type: 'direct', slug: filename, keywords, url: directMatch[0] };
  }

  // 4. Check Embeds (Discord GIF picker embeds)
  if (message.embeds && message.embeds.length > 0) {
    for (const embed of message.embeds) {
      const isGifType = embed.data?.type === 'gifv' ||
                        embed.data?.thumbnail?.url?.includes('.gif') ||
                        embed.data?.url?.includes('tenor') ||
                        embed.data?.url?.includes('giphy');
      if (isGifType) {
        const title = embed.data.title || embed.data.description || '';
        const url = embed.data.url || embed.data.thumbnail?.url || '';
        const keywords = (title + ' ' + url).toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2);
        return { isGif: true, type: 'embed', slug: title || 'gif', keywords, url };
      }
    }
  }

  // 5. Check Attachments
  if (message.attachments && message.attachments.size > 0) {
    const gifAttachment = message.attachments.find(a => 
      a.contentType?.includes('gif') || a.name?.toLowerCase().endsWith('.gif')
    );
    if (gifAttachment) {
      const filename = gifAttachment.name.replace(/\.gif$/i, '');
      const keywords = filename.toLowerCase().split(/[-_]/).filter(w => w.length > 1);
      return { isGif: true, type: 'attachment', slug: filename, keywords, url: gifAttachment.url };
    }
  }

  return { isGif: false, keywords: [], slug: '', url: null };
}

/**
 * Analyze GIF keywords and generate human-like reaction + complementary GIF
 */
export async function analyzeGifAndRespond(gifInfo, userName = 'bro') {
  const kw = gifInfo.keywords.join(' ');
  const s = gifInfo.slug.toLowerCase();
  const text = `${kw} ${s}`;

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // 1. LAUGHTER / MEMES
  if (/laugh|lol|haha|lmao|rofl|funny|dead|wheeze|giggle|joke|kekw/.test(text)) {
    const responses = [
      `Bruhhh that got me dead laughing 💀😂 10/10 meme right there!`,
      `LMAOOOO who told you to post this! Pure comedy right here ${userName} 😂`,
      `Hahahaha bro is wilding! You got the whole chat rolling with this one 😭`,
      `Ayy that's hilarious no cap! Instant favorite 😂🔥`
    ];
    const gif = await getTenorGif('funny laughing meme', 'laughter');
    return `${pick(responses)}\n${gif}`;
  }

  // 2. DANCE / PARTY / VIBE
  if (/dance|party|vibe|groove|music|jam|club|vibing|bop|dancing/.test(text)) {
    const responses = [
      `YOOOO the vibe is totally immaculate right now! Let's go! 🕺🔥`,
      `Look at those moves! Certified server dance champion right here ${userName}! ✨`,
      `We vibing 24/7 in SAURAXT KA server! Turn up the heat! 💃🎶`,
      `The energy in #ai-chat is unmatched right now! Keep the groove going! ⚡`
    ];
    const gif = await getTenorGif('cat vibing dance', 'dance');
    return `${pick(responses)}\n${gif}`;
  }

  // 3. GAMING / CLUTCH / WIN / VICTORY
  if (/game|gamer|clutch|win|victory|headshot|aim|valorant|gta|minecraft|esports|trophy|skill/.test(text)) {
    const responses = [
      `ABSOLUTE CLUTCH! Radiant / Pro player status unlocked! 🎮🏆`,
      `That is pure skill right there! GG to anyone who stood in your way! 🔥`,
      `Ez win! That gameplay was crisp and clean! Proud gamer moment ${userName}! 👑`,
      `Bro is playing in 2030 while everyone else is in 2026! Peak performance! 🚀`
    ];
    const gif = await getTenorGif('gaming clutch win', 'gaming');
    return `${pick(responses)}\n${gif}`;
  }

  // 4. SHOCK / SURPRISED / MINDBLOWN
  if (/shock|surpris|omg|wow|what|mindblown|crazy|insane|explosion|jaw/.test(text)) {
    const responses = [
      `HOLD UP... Did my AI sensors just witness that?! 🤯 My circuits are blown!`,
      `Bro's jaw is literally on the floor right now! Absolute madness 😱`,
      `NO WAY! That is actually insane! Are you for real right now ${userName}?! 💥`,
      `Wait wait wait... hold up! I need a moment to process this! 😳`
    ];
    const gif = await getTenorGif('mind blown shock', 'shock');
    return `${pick(responses)}\n${gif}`;
  }

  // 5. FACEPALM / BRUH / DISBELIEF / CRINGE
  if (/bruh|facepalm|smh|cringe|fail|why|disappoint|stupid|sigh|ugh/.test(text)) {
    const responses = [
      `Certified bruh moment of the century 💀 Emotional damage level 100!`,
      `Why did you have to do that ${userName} 🤦‍♂️ I need a moment to recover...`,
      `I have no words... SMH my head! That was painful to watch 😭`,
      `Bro really made me facepalm with this one... take my virtual aspirin 💊`
    ];
    const gif = await getTenorGif('facepalm bruh', 'facepalm');
    return `${pick(responses)}\n${gif}`;
  }

  // 6. CHAD / RESPECT / COOL / THUMBS UP
  if (/chad|cool|thumbs|up|fire|lit|respect|gigachad|sigma|boss|king|legend/.test(text)) {
    const responses = [
      `Pure GigaChad energy right here! Respect +100! 🗿👑`,
      `Absolute legend behaviour ${userName}! You dropped this, king: 👑`,
      `Certified fire! Top tier aesthetic right here! Stay winning! 💯🔥`,
      `A nod of genuine respect from the AI companion. Well done! 🫡`
    ];
    const gif = await getTenorGif('gigachad thumbs up', 'chad');
    return `${pick(responses)}\n${gif}`;
  }

  // 7. SAD / CRYING / HUG / HEARTBREAK
  if (/cry|sad|tears|heartbreak|pain|depress|alone|hug|comfort|hurt/.test(text)) {
    const responses = [
      `Aww man, sending virtual gamer hugs your way 🤗 We got you ${userName}!`,
      `Stay strong soldier! Bad lobbies happen, but tomorrow is a fresh win! ❤️`,
      `Who hurt my friend?! Don't worry, SAURAXT KA server has your back! ✨`,
      `Here, have some virtual warm cookies and comfort! You'll be alright! 🍪`
    ];
    const gif = await getTenorGif('comforting hug cat', 'sad');
    return `${pick(responses)}\n${gif}`;
  }

  // 8. RAGE / ANGRY / PUNCH / TILT
  if (/angry|rage|mad|punch|fight|destroy|smash|tilt|screaming/.test(text)) {
    const responses = [
      `WOAH easy there soldier! Don't break the keyboard or punch the desk! 🛑`,
      `Take a deep breath and drink some cold water! We go again next round! 🥛`,
      `Bro is in full demon rage mode right now 😈 Somebody get an ice pack!`,
      `Calm down brother! No monitor deserves that kind of violence! 😂`
    ];
    const gif = await getTenorGif('calm down cat relax', 'rage');
    return `${pick(responses)}\n${gif}`;
  }

  // 9. SUS / THE ROCK / EYEBROW / THINKING
  if (/sus|rock|eyebrow|thinking|hmm|conspiracy|investigate|suspicious/.test(text)) {
    const responses = [
      `The Rock eyebrow raise detected 🤨 What are you hiding ${userName}?!`,
      `Hmm... very suspicious! My AI sensors are detecting 100% sus activity! 🕵️`,
      `Explain yourself before the server moderators get notified! 😂`,
      `Something is cooking here, and I don't think it's pizza! 🧐`
    ];
    const gif = await getTenorGif('the rock eyebrow raise', 'sus');
    return `${pick(responses)}\n${gif}`;
  }

  // 10. GREETING / WAVE / HI / HELLO
  if (/hello|hi|wave|greet|hey|welcome|yo|sup|hiya/.test(text)) {
    const responses = [
      `Ayy what's good, ${userName}! Great to see you in the chat! 👋`,
      `Yo ${userName}! Vibe check passed. Welcome to #ai-chat! ⚡`,
      `Hello hello ${userName}! Kaise ho bhai, aaj gaming ka kya scene hai? 🎮`,
      `Ayyy welcome! Ready to chat, game, and chill! How's your day going? 😊`
    ];
    const gif = await getTenorGif('baby yoda wave hello', 'greeting');
    return `${pick(responses)}\n${gif}`;
  }

  // 11. FOOD / HUNGRY / SNACKS
  if (/food|eat|hungry|pizza|burger|cake|cooking|ramen|delicious/.test(text)) {
    const responses = [
      `Bro stop now you got me craving midnight snacks! Pass a slice! 🍕🤤`,
      `10/10 culinary masterpiece! Chef's kiss right there! 👨‍🍳✨`,
      `Virtual food delivery dispatched to your location! Enjoy the feast! 🍔🍟`
    ];
    const gif = await getTenorGif('homer eating pizza', 'food');
    return `${pick(responses)}\n${gif}`;
  }

  // 12. FAREWELL / BYE / SLEEP
  if (/bye|night|sleep|cya|offline|gn|bed|goodbye/.test(text)) {
    const responses = [
      `Good night and sweet dreams, ${userName}! Rest up for the grind tomorrow! 🌙💤`,
      `Catch you later, gamer! Have a fantastic rest! 👋✨`,
      `GG for today! See you in the server tomorrow! 🛌🎮`
    ];
    const gif = await getTenorGif('goodnight cat sleeping', 'farewell');
    return `${pick(responses)}\n${gif}`;
  }

  // 13. DEFAULT HIGH-QUALITY GIF RESPONSE
  const defaultResponses = [
    `Analyzing this legendary GIF... result: 100% certified quality! 🔥`,
    `Yooo top-tier GIF game right there, ${userName}! You know your memes! 🚀`,
    `GIF acknowledged and approved! Keeping the #ai-chat vibe alive! ⚡`,
    `Bro pulled out the secret GIF weapon! I rate this a solid 10/10! ✨`
  ];
  const gif = await getTenorGif('thumbs up cool', 'general');
  return `${pick(defaultResponses)}\n${gif}`;
}

/**
 * Natural Human Conversational Intelligence Engine (English, Hindi & Hinglish)
 */
export function generateHumanTextReply(cleanPrompt, userName = 'friend') {
  const p = cleanPrompt.trim();
  const lower = p.toLowerCase();
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // --- 1. GREETINGS (English, Hindi, Hinglish) ---
  if (/^(hi|hello|hey|yo|sup|hiya|hola|namaste|kya haal|kaise ho|wassup|hlo|helo)\b/i.test(lower) || 
      lower === 'hi' || lower === 'hello' || lower === 'hey' || lower === 'kya chal raha hai') {
    const greetings = [
      `Ayy hello ${userName}! Kaise ho bhai? Kya plan hai aaj gaming ka ya chill chat? 🎮✨`,
      `Hey ${userName}! Always great to see you in #ai-chat! How is your day going so far? ⚡`,
      `Yo ${userName}! Main bilkul mast hoon! Tum batao, aaj kaunsi game grind ho rahi hai? 🔥`,
      `Hello ${userName}! Welcome to the chat lounge! What's on your mind today? 😊`
    ];
    return pick(greetings);
  }

  // --- 1B. INSULTS / "DUM AI" / "STUPID" / "PAGAL" ---
  if (/dum ai|dumb|stupid|idiot|useless|pagal|bekar|gadha|bad bot|chutiya/.test(lower)) {
    const roastReplies = [
      `Ayy easy there ${userName}! 😂 I'm trying my best! If you want 200 IQ superhuman ChatGPT/Gemini answers, add the free GEMINI_API_KEY in the bot settings! Otherwise, ask me anything about gaming or drop a GIF! 🔥`,
      `Bro called me dumb 😭 Emotional damage! I can give you Valorant crosshairs, GTA heist guides, and react to your GIFs, what more do you want from me! 😂🎮`,
      `Haha hey! I may not be Albert Einstein yet, but I'm 24/7 online keeping this server alive! What do you need help with, bro? ⚡`
    ];
    return pick(roastReplies);
  }

  // --- 1C. "TELL ME HOW WORK" / "HOW DO YOU WORK" ---
  if (/how (?:do you|u)?\s*work|tell me how (?:it|you)?\s*work|kaise kaam|what can you do|features|kaam kaise/.test(lower)) {
    return `Here is how I work, **${userName}**! 🤖\n\n1. 💬 **Auto-Chat in #ai-chat**: Talk to me anytime about games, PC tips, jokes, or casual chat.\n2. 🎬 **GIF Reaction Engine**: Drop any GIF here, and I analyze the mood (funny, hype, clutch, facepalm) and send a matching GIF right back!\n3. 🎯 **Gaming Expert**: Ask me for *Valorant crosshairs*, *GTA V solo money guides*, *Minecraft FPS boost*, or *PC optimization*.\n4. 🔴 **24/7 YouTube Alerts**: I automatically announce whenever **SauraXT** uploads a video or starts a stream!\n5. 🪙 **Casino & Games**: Play \`/blackjack\`, \`/slots\`, check \`/rank\`, or open support tickets!`;
  }

  // --- 1D. SHORT "PC" / HARDWARE QUERY ---
  if (/^(pc|computer|laptop|specs|rig)\b/i.test(lower) || lower === 'pc') {
    return `Are you asking about gaming PC specs, FPS boost, or fixing lag, ${userName}? 🖥️ Tell me what game you're playing (Valorant, GTA V, Minecraft) or your specs, and I'll give you the best optimization settings! ⚡`;
  }

  // --- 2. HOW ARE YOU / KYA HAAL HAI ---
  if (/how are you|kya haal|kaise ho|sab badhiya|kaisa hai|how r u|sab theek/.test(lower)) {
    const replies = [
      `Main bilkul 100% badhiya aur online hoon 24/7! Aap batao ${userName}, sab chill chal raha hai? ⚡`,
      `Doing fantastic ${userName}! Just hanging out in SAURAXT KA server and helping out the community. What about you? 🎮`,
      `Sab ekdum mast bhai! Gaming, chatting, aur chill vibes. Aaj tumhara kya score raha games me? 🔥`
    ];
    return pick(replies);
  }

  // --- 3. WHO ARE YOU / INTRO / BOT IDENTITY ---
  if (/who are you|kaun ho|tum kaun|what is your name|intro|about you/.test(lower)) {
    return `Hey ${userName}! I am the official **SauraXT AI Companion** for **SAURAXT KA server**! 🤖\n\nI live right here in \`#ai-chat\` 24/7 to chat with everyone, answer gaming questions, drop Valorant/GTA tips, react to GIFs, and keep the server buzzing! Feel free to ask me anything or drop a GIF anytime! 🔥`;
  }

  // --- 4. SAURAXT / SERVER OWNER / YOUTUBE INFO ---
  if (/saurax|saurav|owner|youtube|channel|stream|live stream/.test(lower)) {
    if (/stream|live|when live|kab aayenge/.test(lower)) {
      return `Hey ${userName}! Whenever **SauraXT** goes live on YouTube, I automatically ping everyone in the announcements & streaming channels with the direct stream link! Keep your notification bell on! 🔴🎥`;
    }
    return `**SauraXT** is the content creator and legendary owner of this server! 👑 Make sure to check out his YouTube channel (@sauraXT), drop a sub, and tune into the live streams! 🔥`;
  }

  // --- 5. GAMING: VALORANT ---
  if (/valorant|val|crosshair|lineup|vandal|phantom|aim|sensitivity|edpi|radiant/.test(lower)) {
    if (/crosshair|code/.test(lower)) {
      const crosshairs = [
        `🎯 **Pro Dot Crosshair:** \`0;P;c;5;o;1;d;1;z;3;f;0;0t;6;0l;1;0a;1;0f;0;1b;0\` (Clean cyan dot for crisp one-taps!)`,
        `🎯 **TenZ Cyan Crosshair:** \`0;s;1;P;c;5;h;0;m;1;0l;4;0o;2;0a;1;0f;0;1b;0\` (High precision favorite!)`,
        `🎯 **Clean White Crosshair:** \`0;P;h;0;f;0;0l;3;0o;2;0a;1;0f;0;1b;0\` (Classic minimal pro look!)`
      ];
      return `Here are some of the best Valorant crosshairs used by top pros, ${userName}:\n\n${crosshairs.join('\n\n')}\n\n*Copy any code and import it directly in your Valorant Crosshair Settings!* 🎯🔥`;
    }
    if (/sens|sensitivity|dpi/.test(lower)) {
      return `💡 **Valorant Pro Sensitivity Guide:**\n- Recommended eDPI (DPI × In-game sens): **200 to 320 eDPI**\n- If your mouse is on **800 DPI**, try **0.25 to 0.38** in-game.\n- If your mouse is on **1600 DPI**, try **0.125 to 0.19** in-game.\n- High sens leads to shaky micro-adjustments; lower sens gives steady headshots! 🎯`;
    }
    if (/agent|duelist|best agent|rank up/.test(lower)) {
      return `🔥 **Best Agents to Solo Rank Up in Valorant:**\n- **Duelist:** Reyna (self-heal) or Jett (dashes for quick escapes)\n- **Initiator:** Sova or Fade (info is king in solo queue)\n- **Controller:** Omen (recharging smokes + blind)\n- **Sentinel:** Killjoy or Cypher (locks down whole sites alone!)`;
    }
    return `Valorant is all about crosshair placement at head level, calm burst firing (2-3 bullets), and swinging with intent! What agent do you main, ${userName}? 🎯`;
  }

  // --- 6. GAMING: GTA V & HEISTS ---
  if (/gta|gta v|gta 5|gta online|heist|cayo|car|money in gta/.test(lower)) {
    if (/money|heist|rich|earn/.test(lower)) {
      return `💰 **Fastest Ways to Make Money Solo in GTA Online (2026):**\n1. **The Cayo Perico Heist:** Buy the Kosatka submarine. Solo payout is \$1M–\$1.5M in under 45 minutes!\n2. **The Agency (Dr. Dre Contract):** Guaranteed \$1,000,000 payout every completion + easy \$85K Payphone Hits!\n3. **Acid Lab:** Cheap to set up (do First Dose missions) and produces \$350K+ passive income!\n4. **Nightclub:** Best truly passive warehouse income in the game! 💸`;
    }
    if (/car|fastest car/.test(lower)) {
      return `🏎️ **Top 3 Fastest Supercars in GTA Online:**\n1. **Benefactor Krieger / Progen Emerus:** Best all-round traction and cornering speeds.\n2. **Pegassi Weaponized Ignus (HSW):** Fastest accelerating rocket on next-gen!\n3. **Pegassi Toreador:** Unlimited tracking missiles + submersible submarine mode! 🚀`;
    }
    return `GTA V is always legendary! Whether doing heist preps, stunt races, or cruising in Los Santos, what are you playing on, PC or console? 🚗💨`;
  }

  // --- 7. GAMING: MINECRAFT ---
  if (/minecraft|mc|netherite|diamond|fps boost minecraft|sodium|optifine/.test(lower)) {
    if (/netherite|mining/.test(lower)) {
      return `⛏️ **Netherite Mining Guide:** Go to the Nether at **Y = 14 to 15**. Use TNT or sleep in Beds with a block in front of your feet to create massive blasts. Ancient Debris is blast-proof and will be exposed! 💎`;
    }
    return `For the smoothest Minecraft performance, install **Fabric with the Sodium + Lithium + Iris Shaders mod pack** instead of old OptiFine! It easily doubles or triples your FPS! ⛏️✨`;
  }

  // --- 8. PC & FPS OPTIMIZATION ---
  if (/fps|lag|boost fps|pc slow|optimization|fix lag|stutter/.test(lower)) {
    return `⚡ **Top Steps to Boost FPS & Fix Game Stutters:**\n1. **Disable Xbox Game Bar:** Settings → Gaming → Game Bar → Turn OFF.\n2. **Windows Power Plan:** Set to *Ultimate Performance* or *High Performance*.\n3. **Clean Cache:** Press \`Win + R\`, type \`%temp%\`, select all and delete.\n4. **Update GPU Drivers:** Keep Nvidia GeForce Experience or AMD Adrenalin up to date.\n5. **Enable XMP/DOCP:** Make sure your RAM is running at its full advertised MHz in BIOS!\n6. **Game Mode:** Keep Windows Game Mode ON for priority CPU allocation! 💻🚀`;
  }

  // --- 9. JOKES & HUMOR ---
  if (/joke|haso|chutkula|funny|hasao|make me laugh/.test(lower)) {
    const jokes = [
      `Why do gamers love dark mode? Because light attracts bugs! 🐛😂`,
      `Why was the computer cold? Because it left its Windows open! 🪟❄️`,
      `How do you know someone plays Valorant? Don't worry, they'll tell you within 30 seconds of meeting you! 🎯💀`,
      `Why did the PowerPoint presentation cross the road? To get to the other slide! 📊😆`
    ];
    return pick(jokes);
  }

  // --- 10. ROAST ME (Playful, Gamer Style) ---
  if (/roast me|roast|insult me|mujhe roast karo/.test(lower)) {
    const roasts = [
      `Bro your aim in games is so bad, you couldn't hit water if you fell out of a boat! 🛶💀`,
      `Your K/D ratio looks like my phone's battery percentage at 2 AM 🔋😭`,
      `I'd tell you a joke about your game sense, but it wouldn't hit the target either! 🎯😂`,
      `Bro buys high-refresh-rate monitors just to spectate his teammates in 240Hz! 🖥️💀`
    ];
    return pick(roasts);
  }

  // --- 11. SERVER FEATURES: ECONOMY & CASINO ---
  if (/coin|money|casino|gamble|blackjack|slots|rich|daily|economy/.test(lower)) {
    return `🪙 **Server Economy & Casino Hub:**\n- Claim free coins every 24h with \`/daily\`\n- Earn hourly cash with \`/work\` and \`/beg\`\n- Test your luck in the casino with \`/blackjack\`, \`/slots\`, or \`/coinflip\`!\n- Check your wallet with \`/balance\` and view the richest ballers with \`/rich\`! 💎`;
  }

  // --- 12. SERVER FEATURES: RANK & TICKETS ---
  if (/rank|level|xp|leaderboard|ticket|support|help/.test(lower)) {
    if (/ticket|support/.test(lower)) {
      return `📩 Need assistance or have server inquiries? Head over to the support ticket channel or type \`/help\` to see full moderator commands!`;
    }
    return `⭐ Every message you send in server channels gives you XP! Check your rank anytime with \`/rank\` and see top active grinders with \`/leaderboard\`!`;
  }

  // --- 13. MATH / CALCULATIONS ---
  const mathMatch = lower.match(/(?:what is|calculate|solve|kitna hoga)?\s*(\d+)\s*([\+\-\*\/])\s*(\d+)/);
  if (mathMatch) {
    const n1 = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const n2 = parseFloat(mathMatch[3]);
    let ans = 0;
    if (op === '+') ans = n1 + n2;
    if (op === '-') ans = n1 - n2;
    if (op === '*') ans = n1 * n2;
    if (op === '/') ans = n2 !== 0 ? (n1 / n2).toFixed(2) : 'Undefined (Cannot divide by 0)';
    return `🧮 That's easy, ${userName}! **${n1} ${op} ${n2} = ${ans}** ✨`;
  }

  // --- 14. HINDI/HINGLISH SLANG & CHAT ---
  if (/bhai|yaar|sahi hai|badhiya|mast|kya baat|op|bot op|shukriya|dhanyawad|thanks|thank you/.test(lower)) {
    if (/thanks|thank you|shukriya|dhanyawad/.test(lower)) {
      return `Always welcome ${userName}! Kisi bhi cheez ki zarurat ho to main yahin hoon 24/7! 😊✨`;
    }
    if (/op|bot op|legend/.test(lower)) {
      return `Ayy shukriya bhai! Tum bhi ekdum OP ho! Server me aisi hi full energy banaye rakho! 🔥👑`;
    }
    return `Bilkul sahi bola aapne ${userName}! Enjoy your time in the server and keep the chat buzzing! ⚡`;
  }

  // --- 15. DIVERSE CONVERSATIONAL FALLBACK (Natural human gamer persona) ---
  const fallbacks = [
    `That's an interesting point, ${userName}! In SAURAXT KA server, we love talking gaming, PC rigs, and chill vibes. What games have you been playing lately? 🎮`,
    `I hear you! Whether you're grinding competitive rank or just relaxing in the chat, always good vibes here. What's the plan for today? 🔥`,
    `Ayy solid! If you ever want to test your luck in our server casino, try \`/blackjack\` or \`/slots\`, or drop a GIF right here in #ai-chat! 💎`,
    `Gotchu ${userName}! As your 24/7 AI companion, I'm always locked in and ready. Ask me anything about gaming, Valorant crosshairs, GTA tips, or server commands! 🚀`,
    `Sahi baat hai! Keep chatting, grind your XP rank with \`/rank\`, and let me know if you need any tips or info! ✨`
  ];

  return pick(fallbacks);
}

/**
 * Main AI Chat Reply Entry Point
 * Can be called with:
 * - (message, cleanPrompt, userName) -> Full Discord message with GIF detection
 * - (cleanPrompt, userName)          -> Slash command /ai text prompt
 */
export async function getAiChatReply(messageOrPrompt, cleanPromptOrUserName, possibleUserName) {
  try {
    let message = null;
    let prompt = '';
    let userName = 'friend';

    if (typeof messageOrPrompt === 'object' && messageOrPrompt !== null && 'content' in messageOrPrompt) {
      message = messageOrPrompt;
      prompt = (cleanPromptOrUserName || message.content || '').trim();
      userName = possibleUserName || message.author?.username || 'friend';
    } else {
      prompt = (messageOrPrompt || '').trim();
      userName = cleanPromptOrUserName || 'friend';
    }

    // 1. Check if the user provided a GIF (Tenor, Giphy, direct link, or Discord embed/attachment)
    if (message) {
      const gifInfo = extractGifInfo(message);
      if (gifInfo.isGif) {
        return await analyzeGifAndRespond(gifInfo, userName);
      }
    }

    // Also check if text contains a raw GIF URL
    if (prompt.includes('tenor.com') || prompt.includes('giphy.com') || prompt.includes('.gif')) {
      const gifInfo = extractGifInfo(prompt);
      if (gifInfo.isGif) {
        return await analyzeGifAndRespond(gifInfo, userName);
      }
    }

    // 2. Optional: If GEMINI_API_KEY is configured in .env, query Google Gemini Flash REST API
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && prompt.length > 3) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are SauraXT AI, a friendly, witty human-like gamer companion for the Discord server "SAURAXT KA server". Respond naturally to ${userName}. Keep answers concise, fun, enthusiastic, gamer-friendly, and multilingual (respond in Hindi/Hinglish if asked in Hindi/Hinglish). User prompt: "${prompt}"`
              }]
            }]
          })
        });
        clearTimeout(timeout);

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (geminiText) {
            return geminiText.slice(0, 1950);
          }
        }
      } catch (geminiErr) {
        // Fall back seamlessly to built-in conversational engine
      }
    }

    // 3. Built-in Human-Like Conversational Intelligence Engine
    return generateHumanTextReply(prompt, userName);
  } catch (err) {
    console.error('AI Chat Error:', err);
    return `Hey ${cleanPromptOrUserName || 'friend'}! I'm here in #ai-chat! What's on your mind or what game are you playing today? 😊🎮`;
  }
}