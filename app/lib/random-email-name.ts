const maleNames = [
  "alex",
  "asher",
  "benjamin",
  "caleb",
  "christopher",
  "daniel",
  "david",
  "dylan",
  "elijah",
  "ethan",
  "ezra",
  "gabriel",
  "henry",
  "hudson",
  "isaac",
  "jack",
  "jacob",
  "james",
  "jayden",
  "julian",
  "levi",
  "leo",
  "liam",
  "logan",
  "lucas",
  "mason",
  "matthew",
  "michael",
  "noah"
]

const femaleNames = [
  "amelia",
  "aria",
  "ava",
  "avery",
  "camila",
  "charlotte",
  "chloe",
  "ella",
  "elizabeth",
  "emma",
  "emily",
  "evelyn",
  "grace",
  "hannah",
  "harper",
  "isabella",
  "layla",
  "lily",
  "madison",
  "mia",
  "natalie",
  "olivia",
  "scarlett",
  "sophia",
  "stella",
  "victoria",
  "zoey"
]

const lastNames = [
  "anderson",
  "bailey",
  "bennett",
  "brown",
  "brooks",
  "carter",
  "clark",
  "coleman",
  "cooper",
  "davis",
  "edwards",
  "evans",
  "foster",
  "garcia",
  "griffin",
  "gray",
  "green",
  "harris",
  "hayes",
  "hill",
  "howard",
  "hughes",
  "jackson",
  "jenkins",
  "kelly",
  "king",
  "lewis",
  "long",
  "martin",
  "morgan",
  "nelson",
  "parker",
  "price",
  "reed",
  "richardson",
  "ross",
  "scott",
  "stewart",
  "taylor"
]

const firstNames = [...maleNames, ...femaleNames]

function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function getRandomDigits(length: number): string {
  return Math.floor(Math.random() * 10 ** length).toString().padStart(length, "0")
}

export function generateRandomEmailName(): string {
  return `${getRandomItem(firstNames)}.${getRandomItem(lastNames)}.${getRandomDigits(4)}`
}
