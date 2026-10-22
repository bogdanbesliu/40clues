export interface DailyGame {
    id: string;
    category: string;
    gameDate: string;
    title: string;
    year: number;
    clues: string[];
  }
  
  export const TODAY_MOCK_GAME: DailyGame = {
    id: "clue-001",
    category: "movie",
    gameDate: new Date().toISOString().split("T")[0],
    title: "Inception",
    year: 2010,
    clues: [
      "A spinning top determines whether reality is authentic or fabricated.",
      "A hotel hallway sequence defies gravity during an intense fistfight.",
      "There are approximately 14 visible briefcases in the airport boarding scene.",
      "'You mustn't be afraid to dream a little bigger, darling.'",
      "A specialized architect is hired to design intricate subconscious mazes.",
      "A massive freight train plows through downtown traffic in broad daylight.",
      "The crew used real explosives instead of CGI for a sidewalk café explosion.",
      "Someone brought a literal rocket launcher into a dream world.",
      "A snowy fortress assault feels suspiciously like an homage to vintage spy thrillers.",
      "The entire plot happens because a corporate heir has unresolved daddy issues.",
      "A brassy, slowed-down Édith Piaf song acts as an synchronized alarm clock.",
      "A pen sits on an airline tray table for 20 minutes of screen time without moving.",
      "Falling backward into a bathtub full of water is considered high-grade security protocol.",
      "'An idea is like a virus. Resilient. Highly contagious.'",
      "A weighted die with a very specific secret balance serves as a sanity check.",
      "The main character is legally barred from seeing his own children back home.",
      "A brass musical horn 'BRAAAM' became a staple of Hollywood movie trailers for a decade.",
      "A passport is stamped at customs without a single verbal question asked.",
      "A van spends roughly 45 minutes of movie time slowly falling off a bridge.",
      "Someone literally explains the plot using folded sheets of paper.",
      "The director insisted on building a giant rotating cylinder instead of using digital effects.",
      "A wealthy client purchases an entire airline just to ensure privacy during a 10-hour flight.",
      "A red leather chair remains completely untouched during a chaotic rainstorm.",
      "'Downwards is the only way backwards.'",
      "The primary antagonist is a projection of the protagonist's late spouse.",
      "A sedative strong enough to stabilize dream-sharing also risks creating an infinite limbo.",
      "A brass medallion with carved chess pieces is handled with surgical care.",
      "A team member wakes up smelling like gasoline and saltwater.",
      "A character casually asks for a glass of water while holding an automatic rifle.",
      "The legal charges against the team leader are mysteriously erased with a single phone call.",
      "A massive brass vault door requires a combination nobody actually memorized.",
      "A staircase that loops infinitely back into itself causes someone to fall backwards.",
      "A hotel manager questions why a guest ordered an excessive amount of pillows.",
      "The ending scene cuts directly to black before resolving the central physical test.",
      "The musical score was composed with instruments playing the primary song at fractions of normal tempo.",
      "An umbrella is opened inside a building, which is traditionally bad luck.",
      "A photograph of two kids building sandcastles appears in emotional flashbacks.",
      "A business competitor is manipulated into voluntarily dismantling his father's energy empire.",
      "A spinning coin lands on its side in an early deleted dialogue idea.",
      "A broken glass of whiskey is completely ignored during an international corporate negotiation."
    ]
  };