export async function getAiChatReply(prompt, userName) {
  try {
    const cleanPrompt = prompt.trim();
    const lower = cleanPrompt.toLowerCase();

    // 1. Contextual Server / Bot Custom Answers
    if (lower.includes('who are you') || lower.includes('kaun ho') || lower.includes('intro')) {
      return `Hey ${userName}! I am the official **SAURAXT All-in-One AI Bot** for **SAURAXT KA server**! 🤖 I handle moderation, 24/7 YouTube stream alerts, fun casino games, support tickets, rank leveling, and automatic chatting!`;
    }

    if (lower.includes('stream') || lower.includes('live') || lower.includes('youtube')) {
      return `Hey ${userName}! When SAURAXT goes live on YouTube, I automatically ping everyone with direct stream links in the streaming channel! Make sure to stay tuned and keep your notifications ON! 🔴🎥`;
    }

    if (lower.includes('saurax') || lower.includes('saurav') || lower.includes('owner')) {
      return `SAURAXT is the owner and creator of this awesome community! Check out his streams and stay active in the chat! 👑🔥`;
    }

    if (lower.includes('kya haal') || lower.includes('kaise ho') || lower.includes('how are you')) {
      return `Main bilkul mast aur 100% online hoon 24/7 cloud par! Aap batao ${userName}, aaj kya plan hai gaming ya chat? ⚡`;
    }

    if (lower.includes('help') || lower.includes('madad')) {
      return `Aap server me kisi bhi feature ke liye \`/help\` use kar sakte ho! We have Economy, Blackjack, Tickets, Rank card, Moderation and Giveaways! 💡`;
    }

    // 2. Query DuckDuckGo Instant Knowledge API
    const apiUrl = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(cleanPrompt) + '&format=json&no_html=1&skip_disambig=1';
    const res = await fetch(apiUrl).catch(() => null);
    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.AbstractText) {
        return data.AbstractText;
      }
      if (data && data.RelatedTopics && data.RelatedTopics[0] && data.RelatedTopics[0].Text) {
        return data.RelatedTopics[0].Text;
      }
    }

    // 3. Conversational smart replies
    const fallbacks = [
      `That is an interesting question, ${userName}! In SAURAXT KA server, we love talking about gaming, tech, content creation, and chill vibes. Type /help to see all mini-games and tools! 🎮`,
      `I hear you, ${userName}! If you need help with anything in the server or want to test your luck in the casino, try /blackjack or /slots! 💎`,
      `Awesome question! As the 24/7 AI companion of SAURAXT KA server, I'm always here to chat and keep the community active. 🔥`,
      `Bilkul sahi bola aapne ${userName}! Enjoy your time on SAURAXT KA server! ✨`
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  } catch (err) {
    console.error('AI Reply error:', err);
    return `Hey ${userName}, I'm here! What would you like to talk about or play today? 😊`;
  }
}