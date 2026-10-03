// ── DevDict knowledge base ──────────────────────────────────────────────
// Developer Dictionary content for the AI chatbot: programming language
// profiles and developer career profiles, written in Indonesian (id) and
// English (en). Text uses the chat renderer's markdown-lite subset
// (**bold**, bullets) — no headings/HTML here.

export interface LanguageProfile {
  slug: string; // canonical slug (matches catalog `languages` entries)
  name: string;
  aliases: string[];
  since: number;
  difficultyId: string;
  difficultyEn: string;
  taglineId: string;
  taglineEn: string;
  descId: string;
  descEn: string;
  useCases: string[];
  frameworks: string[];
  careers: string[]; // career profile slugs
  stackSlug?: string; // /stacks/{slug} when a preset exists
  factId: string;
  factEn: string;
  emoji: string;
}

export const LANGUAGES: LanguageProfile[] = [
  {
    slug: "python",
    name: "Python",
    aliases: ["python", "py"],
    since: 1991,
    difficultyId: "Mudah — sering jadi bahasa pertama yang direkomendasikan",
    difficultyEn: "Easy — a common first language recommendation",
    taglineId: "Raja AI, data science, dan otomasi.",
    taglineEn: "King of AI, data science, and automation.",
    descId:
      "Bahasa tingkat tinggi dengan sintaks bersih yang mirip bahasa manusia, sehingga cepat dipelajari dan cepat dipakai. Ekosistemnya sangat luas: dari analisis data, machine learning, backend web, sampai skrip otomasi sehari-hari.",
    descEn:
      "A high-level language whose clean, human-like syntax makes it fast to learn and fast to ship. Its ecosystem is huge: data analysis, machine learning, web backends, and everyday automation scripts.",
    useCases: ["AI & Machine Learning", "Data Science", "Backend Web", "Otomasi & Scripting", "Web Scraping"],
    frameworks: ["Django", "FastAPI", "Flask", "Pandas", "PyTorch"],
    careers: ["data-scientist", "ml-engineer", "data-analyst", "backend-dev", "qa-engineer"],
    stackSlug: "python",
    factId: "Dinamai dari grup komedi Monty Python, bukan dari ular. 🐍",
    factEn: "Named after the comedy group Monty Python, not the snake. 🐍",
    emoji: "🐍",
  },
  {
    slug: "javascript",
    name: "JavaScript",
    aliases: ["javascript", "java script", "js"],
    since: 1995,
    difficultyId: "Mudah–Sedang — mudah dimulai, dalamnya luas",
    difficultyEn: "Easy–Moderate — quick to start, deep to master",
    taglineId: "Satu-satunya bahasa yang ada di mana-mana: browser, server, sampai mobile.",
    taglineEn: "The only language that runs everywhere: browser, server, and mobile.",
    descId:
      "Bahasa wajib web — semua browser menjalankannya, dan lewat Node.js ia juga menguasai sisi server. Satu bahasa untuk frontend, backend, mobile (React Native), dan desktop (Electron).",
    descEn:
      "The language of the web — every browser runs it, and through Node.js it owns the server side too. One language for frontend, backend, mobile (React Native), and desktop (Electron).",
    useCases: ["Frontend Web", "Backend (Node.js)", "Mobile (React Native)", "Desktop (Electron)"],
    frameworks: ["React", "Next.js", "Vue", "Express", "Node.js"],
    careers: ["frontend-dev", "fullstack-dev", "backend-dev", "mobile-dev", "qa-engineer"],
    stackSlug: "nodejs",
    factId: "Dibuat Brendan Eich hanya dalam 10 hari pada tahun 1995. ⚡",
    factEn: "Created by Brendan Eich in just 10 days back in 1995. ⚡",
    emoji: "🟨",
  },
  {
    slug: "typescript",
    name: "TypeScript",
    aliases: ["typescript", "type script", "ts"],
    since: 2012,
    difficultyId: "Sedang — paling nyaman setelah kenal JavaScript",
    difficultyEn: "Moderate — most comfortable after some JavaScript",
    taglineId: "JavaScript dengan sistem tipe yang membuat kode besar tetap terkontrol.",
    taglineEn: "JavaScript with a type system that keeps big codebases sane.",
    descId:
      "Superset JavaScript yang menambahkan tipe statis: error tertangkap sebelum jalan, autocomplete jadi cerdas, dan refactor besar jadi aman. Kini jadi standar de facto untuk proyek web modern.",
    descEn:
      "A JavaScript superset that adds static types: errors are caught before runtime, autocomplete gets smarter, and large refactors become safe. Now the de facto standard for modern web projects.",
    useCases: ["Frontend & Full-stack Web", "Backend (NestJS)", "Library & Design Systems"],
    frameworks: ["React", "Next.js", "Angular", "NestJS", "Deno"],
    careers: ["frontend-dev", "fullstack-dev", "backend-dev", "mobile-dev"],
    stackSlug: "typescript",
    factId: "Dibuat Anders Hejlsberg di Microsoft — orang yang sama di balik C#. 🛡️",
    factEn: "Created by Anders Hejlsberg at Microsoft — the same person behind C#. 🛡️",
    emoji: "🔷",
  },
  {
    slug: "go",
    name: "Go",
    aliases: ["go", "golang"],
    since: 2009,
    difficultyId: "Sedang — sengaja dibuat sederhana, fiturnya sedikit tapi tajam",
    difficultyEn: "Moderate — deliberately simple, few features but sharp",
    taglineId: "Dibuat Google untuk cloud, jaringan, dan sistem yang cepat.",
    taglineEn: "Built at Google for cloud, networking, and fast systems.",
    descId:
      "Bahasa statis yang dikompilasi jadi satu binary — cepat, hemat memori, dan punya concurrency bawaan (goroutine). Dominan di infrastruktur modern: Docker dan Kubernetes ditulis dengan Go.",
    descEn:
      "A compiled, statically-typed language — fast, memory-efficient, with built-in concurrency (goroutines). It dominates modern infrastructure: Docker and Kubernetes are written in Go.",
    useCases: ["Cloud & Microservices", "CLI Tools", "DevOps & Infrastruktur", "Backend performa tinggi"],
    frameworks: ["Gin", "Fiber", "Echo", "Cobra"],
    careers: ["backend-dev", "devops-engineer", "cloud-engineer"],
    stackSlug: "go",
    factId: "Maskot resminya adalah Gopher ( Tupai tanah ), dan komunitasnya sangat bangga akan itu. 🐹",
    factEn: "Its official mascot is the Gopher, and the community is proud of it. 🐹",
    emoji: "🐹",
  },
  {
    slug: "rust",
    name: "Rust",
    aliases: ["rust"],
    since: 2010,
    difficultyId: "Menantang — konsep ownership butuh waktu, hasilnya sepadan",
    difficultyEn: "Challenging — ownership takes time, the payoff is real",
    taglineId: "Performa setara C++ dengan jaminan memori aman dari compiler.",
    taglineEn: "C++-level performance with compiler-guaranteed memory safety.",
    descId:
      "Bahasa sistem yang menuntaskan dilema lama: cepat tanpa garbage collector, tapi aman dari segmen fault dan data race. Dipakai untuk engine, WebAssembly, CLI, dan bagian dari kernel Linux & Windows.",
    descEn:
      "A systems language that ends an old trade-off: fast without garbage collection, yet safe from segfaults and data races. Used for engines, WebAssembly, CLIs, and parts of the Linux & Windows kernels.",
    useCases: ["Sistem & Embedded", "WebAssembly", "CLI Tools", "Blockchain"],
    frameworks: ["Tokio", "Axum", "Tauri", "Leptos"],
    careers: ["backend-dev", "game-dev", "devops-engineer"],
    stackSlug: "rust",
    factId: "Berkali-kali dinobatkan sebagai bahasa 'paling dicintai' di survei Stack Overflow. ❤️",
    factEn: "Repeatedly voted the 'most loved' language in Stack Overflow surveys. ❤️",
    emoji: "🦀",
  },
  {
    slug: "java",
    name: "Java",
    aliases: ["java"],
    since: 1995,
    difficultyId: "Sedang — verbose, tapi strukturnya jelas dan konsisten",
    difficultyEn: "Moderate — verbose, but clear and consistent structure",
    taglineId: "Tulang punggung sistem enterprise dan Android.",
    taglineEn: "The backbone of enterprise systems and Android.",
    descId:
      "Bahasa OOP matang yang menjalankan bank, asuransi, dan e-commerce besar lewat JVM. Ekosistemnya dalam: Spring untuk backend, Android SDK untuk mobile, dan tooling big data seperti Kafka & Spark.",
    descEn:
      "A mature OOP language powering banks, insurance, and large e-commerce via the JVM. Its ecosystem runs deep: Spring for backends, the Android SDK for mobile, and big-data tooling like Kafka & Spark.",
    useCases: ["Backend Enterprise", "Android", "Big Data (Kafka, Spark)", "Sistem Perbankan"],
    frameworks: ["Spring Boot", "Hibernate", "Quarkus", "Android SDK"],
    careers: ["backend-dev", "mobile-dev", "data-engineer"],
    stackSlug: "java",
    factId: "Motto lamanya: 'Write once, run anywhere' — dan JVM benar-benar mewujudkannya. ☕",
    factEn: "Its old motto: 'Write once, run anywhere' — and the JVM really delivers. ☕",
    emoji: "☕",
  },
  {
    slug: "kotlin",
    name: "Kotlin",
    aliases: ["kotlin"],
    since: 2011,
    difficultyId: "Sedang — ringkas dan modern, terutama jika sudah kenal Java",
    difficultyEn: "Moderate — concise and modern, especially with Java background",
    taglineId: "Bahasa resmi Android yang lebih ringkas dan aman dari Java.",
    taglineEn: "The official Android language — more concise and safer than Java.",
    descId:
      "Dibuat JetBrains sebagai 'Java yang lebih baik': null-safety bawaan, coroutine untuk async, dan interoperabilitas penuh dengan Java. Sekarang juga dipakai untuk backend (Ktor) dan multiplatform.",
    descEn:
      "Made by JetBrains as 'a better Java': built-in null safety, coroutines for async, and full Java interop. Now also used for backends (Ktor) and multiplatform apps.",
    useCases: ["Android", "Backend (Ktor)", "Multiplatform Mobile"],
    frameworks: ["Jetpack Compose", "Ktor", "Spring Boot", "Kotlin Multiplatform"],
    careers: ["mobile-dev", "backend-dev"],
    factId: "Namanya diambil dari Pulau Kotlin dekat Sankt Peterburg. 🏝️",
    factEn: "Named after Kotlin Island near Saint Petersburg. 🏝️",
    emoji: "🟪",
  },
  {
    slug: "php",
    name: "PHP",
    aliases: ["php"],
    since: 1995,
    difficultyId: "Mudah — langsung jalan di server, minim setup",
    difficultyEn: "Easy — runs on the server with minimal setup",
    taglineId: "Menghidupkan mayoritas website di internet, dari WordPress sampai Laravel.",
    taglineEn: "Powers the majority of the web, from WordPress to Laravel.",
    descId:
      "Bahasa server-side yang mendunia karena mudah dihosting. PHP modern jauh lebih cepat dan rapi: Laravel membuat pengembangan web menyenangkan, dan WordPress menghidupkan ~40% internet.",
    descEn:
      "A server-side language that went global because hosting it is trivial. Modern PHP is fast and clean: Laravel makes web development a joy, and WordPress runs roughly 40% of the internet.",
    useCases: ["Web Backend", "CMS (WordPress)", "E-commerce", "API"],
    frameworks: ["Laravel", "Symfony", "CodeIgniter", "WordPress"],
    careers: ["backend-dev", "fullstack-dev"],
    stackSlug: "laravel",
    factId: "Awalnya singkatan dari 'Personal Home Page', sekarang 'PHP: Hypertext Preprocessor'. 🐘",
    factEn: "Originally 'Personal Home Page', now a recursive 'PHP: Hypertext Preprocessor'. 🐘",
    emoji: "🐘",
  },
  {
    slug: "c#",
    name: "C#",
    aliases: ["c#", "csharp", "c sharp", "cs"],
    since: 2000,
    difficultyId: "Sedang — terstruktur, mirip Java, ekosistem .NET sangat matang",
    difficultyEn: "Moderate — structured, Java-like, with a very mature .NET ecosystem",
    taglineId: "Andalan Microsoft untuk game Unity dan aplikasi enterprise .NET.",
    taglineEn: "Microsoft's workhorse for Unity games and .NET enterprise apps.",
    descId:
      "Bahasa serbaguna di ekosistem .NET: game dengan Unity, backend dengan ASP.NET Core, desktop dengan WPF/MAUI, hingga cloud. Sintaksnya modern dan tooling Visual Studio-nya kelas dunia.",
    descEn:
      "A versatile language in the .NET ecosystem: games with Unity, backends with ASP.NET Core, desktop with WPF/MAUI, and cloud. Modern syntax and world-class Visual Studio tooling.",
    useCases: ["Game (Unity)", "Backend (.NET)", "Desktop (WPF, MAUI)", "Cloud (Azure)"],
    frameworks: ["Unity", "ASP.NET Core", ".NET MAUI", "Blazor"],
    careers: ["game-dev", "backend-dev"],
    factId: "Dibuat Anders Hejlsberg — ya, orang yang sama dengan TypeScript. 🎮",
    factEn: "Created by Anders Hejlsberg — yes, the same person behind TypeScript. 🎮",
    emoji: "🎮",
  },
  {
    slug: "c++",
    name: "C++",
    // Plain strings only — the engine escapes aliases itself when compiling
    // (double-escaping here made "C++" undetectable).
    aliases: ["c++", "cpp", "c plus plus"],
    since: 1985,
    difficultyId: "Menantang — manajemen memori manual, tapi performanya maksimal",
    difficultyEn: "Challenging — manual memory management, maximum performance",
    taglineId: "Bahasa untuk yang butuh performa maksimal: engine game, browser, dan OS.",
    taglineEn: "The language for maximum performance: game engines, browsers, and OSes.",
    descId:
      "Bahasa sistem paling berpengaruh — Chrome, Windows, Unreal Engine, dan mayoritas game AAA ditulis dengannya. Kontrol penuh atas memori dan hardware, dengan ekosistem dekade-dekade.",
    descEn:
      "The most influential systems language — Chrome, Windows, Unreal Engine, and most AAA games are written in it. Full control over memory and hardware, with decades of ecosystem.",
    useCases: ["Game Engine", "Sistem Operasi", "Embedded", "Software Performa Tinggi"],
    frameworks: ["Unreal Engine", "Qt", "Boost", "SDL"],
    careers: ["game-dev", "backend-dev"],
    factId: "Unreal Engine dan hampir semua game AAA berat ditenagai C++. 🚀",
    factEn: "Unreal Engine and nearly every heavy AAA game runs on C++. 🚀",
    emoji: "⚙️",
  },
  {
    slug: "dart",
    name: "Dart",
    aliases: ["dart", "flutter"],
    since: 2011,
    difficultyId: "Mudah–Sedang — sintaks familier jika pernah pegang Java/JS",
    difficultyEn: "Easy–Moderate — familiar syntax if you've touched Java/JS",
    taglineId: "Bahasa di balik Flutter: satu kode untuk Android, iOS, web, dan desktop.",
    taglineEn: "The language behind Flutter: one codebase for Android, iOS, web, and desktop.",
    descId:
      "Dioptimalkan Google untuk UI cepat: hot reload yang instan, kompilasi native, dan framework Flutter yang mengubah cara aplikasi lintas platform dibuat.",
    descEn:
      "Optimized by Google for fast UI: instant hot reload, native compilation, and the Flutter framework that changed cross-platform development.",
    useCases: ["Aplikasi Mobile Lintas Platform", "Web & Desktop (Flutter)"],
    frameworks: ["Flutter"],
    careers: ["mobile-dev", "frontend-dev"],
    stackSlug: "flutter",
    factId: "Google Pay, BMW, dan Alibaba memakai Flutter/Dart di produksi. 🎯",
    factEn: "Google Pay, BMW, and Alibaba run Flutter/Dart in production. 🎯",
    emoji: "🎯",
  },
  {
    slug: "swift",
    name: "Swift",
    aliases: ["swift"],
    since: 2014,
    difficultyId: "Sedang — sintaks modern dan aman, ekosistemnya Apple",
    difficultyEn: "Moderate — modern, safe syntax, Apple ecosystem",
    taglineId: "Bahasa modern Apple untuk iOS, macOS, dan ekosistemnya.",
    taglineEn: "Apple's modern language for iOS, macOS, and beyond.",
    descId:
      "Pengganti Objective-C yang lebih bersih: optional untuk keamanan, Playground untuk belajar interaktif, dan SwiftUI untuk membangun UI dengan cepat di semua perangkat Apple.",
    descEn:
      "A cleaner successor to Objective-C: optionals for safety, Playgrounds for interactive learning, and SwiftUI for building UI quickly across all Apple devices.",
    useCases: ["iOS & iPadOS", "macOS", "watchOS / visionOS"],
    frameworks: ["SwiftUI", "UIKit", "Vapor"],
    careers: ["mobile-dev"],
    factId: "Jadi open source pada 2015 dan bisa jalan di Linux juga. 🕊️",
    factEn: "Open sourced in 2015 and it even runs on Linux. 🕊️",
    emoji: "🕊️",
  },
  {
    slug: "ruby",
    name: "Ruby",
    aliases: ["ruby"],
    since: 1995,
    difficultyId: "Mudah — dirancang untuk membahagiakan programmer",
    difficultyEn: "Easy — designed to make programmers happy",
    taglineId: "Elegan dan ekspresif; Rails mengubah cara dunia membangun web.",
    taglineEn: "Elegant and expressive; Rails changed how the world builds web apps.",
    descId:
      "Bahasa yang mengutamakan keterbacaan dan kesenangan developer. Framework Rails-nya mempopulerkan konvensi-over-configuration dan jadi cikal bakal banyak framework web modern.",
    descEn:
      "A language that prioritizes readability and developer happiness. Its Rails framework popularized convention-over-configuration and inspired most modern web frameworks.",
    useCases: ["Web Backend (Rails)", "Startup & MVP", "Otomasi & Scripting"],
    frameworks: ["Ruby on Rails", "Sinatra", "Hanami"],
    careers: ["backend-dev", "fullstack-dev"],
    factId: "GitHub, Shopify, dan Airbnb dibangun di atas Ruby on Rails. 💎",
    factEn: "GitHub, Shopify, and Airbnb were built on Ruby on Rails. 💎",
    emoji: "💎",
  },
  {
    slug: "sql",
    name: "SQL",
    aliases: ["sql", "database language", "mysql", "postgresql", "postgres"],
    since: 1974,
    difficultyId: "Mudah — deklaratif, kamu bilang 'apa', database yang cari 'caranya'",
    difficultyEn: "Easy — declarative: you say 'what', the database figures out 'how'",
    taglineId: "Bahasa universal untuk berbicara dengan data.",
    taglineEn: "The universal language for talking to data.",
    descId:
      "Bukan bahasa pemrograman umum, tapi keterampilan wajib di hampir semua profesi data & backend. Satu bahasa yang sama untuk MySQL, PostgreSQL, SQLite, sampai data warehouse modern.",
    descEn:
      "Not a general-purpose language, but a must-have skill across data & backend roles. One language for MySQL, PostgreSQL, SQLite, and modern data warehouses alike.",
    useCases: ["Analisis Data", "Backend & Database", "Reporting", "Data Engineering"],
    frameworks: ["PostgreSQL", "MySQL", "SQLite", "BigQuery"],
    careers: ["data-analyst", "data-scientist", "backend-dev", "data-engineer"],
    stackSlug: "postgresql",
    factId: "Dibuat tahun 1974 — lebih tua dari C, dan masih di mana-mana. 🗄️",
    factEn: "Born in 1974 — older than C, and still everywhere. 🗄️",
    emoji: "🗄️",
  },
  {
    slug: "bash",
    name: "Bash / Shell",
    aliases: ["bash", "shell", "zsh", "terminal"],
    since: 1989,
    difficultyId: "Mudah dimulai — satu baris langsung berguna",
    difficultyEn: "Easy to start — one line is instantly useful",
    taglineId: "Lem perekat tiap developer: otomasi, server, dan CI/CD.",
    taglineEn: "Every developer's glue: automation, servers, and CI/CD.",
    descId:
      "Bahasa terminal yang mengotomasi segalanya: deploy, backup, batch proses, sampai pipeline CI/CD. Wajib bagi DevOps, backend, dan siapa pun yang pegang server Linux.",
    descEn:
      "The terminal language that automates everything: deploys, backups, batch jobs, CI/CD pipelines. Essential for DevOps, backends, and anyone touching a Linux server.",
    useCases: ["Otomasi", "DevOps & CI/CD", "Administrasi Server", "Scripting Harian"],
    frameworks: ["GNU Coreutils", "awk", "sed", "cron"],
    careers: ["devops-engineer", "cloud-engineer", "security-engineer"],
    factId: "Nama Bash = 'Bourne Again SHell', permainan kata dari 'Born Again'. 🐚",
    factEn: "Bash = 'Bourne Again SHell', a pun on 'Born Again'. 🐚",
    emoji: "🐚",
  },
  {
    slug: "r",
    name: "R",
    aliases: ["r lang", "bahasa r", "r language", "rstudio"],
    since: 1993,
    difficultyId: "Sedang — sintaks unik, dirancang khusus untuk statistik",
    difficultyEn: "Moderate — unique syntax, purpose-built for statistics",
    taglineId: "Bahasa statistikawan: analisis data dan visualisasi kelas berat.",
    taglineEn: "The statistician's language: heavyweight data analysis and visualization.",
    descId:
      "Dirancang oleh statistikawan untuk statistik: paket uji ilmiah, visualisasi ggplot2, dan RMarkdown untuk laporan yang bisa direproduksi. Kuat di riset, bioinformatika, dan finansial.",
    descEn:
      "Designed by statisticians for statistics: scientific testing packages, ggplot2 visualization, and RMarkdown for reproducible reports. Strong in research, bioinformatics, and finance.",
    useCases: ["Statistika", "Visualisasi Data", "Riset Akademik", "Bioinformatika"],
    frameworks: ["ggplot2", "tidyverse", "Shiny", "RMarkdown"],
    careers: ["data-analyst", "data-scientist"],
    factId: "ggplot2 dari R menginspirasi library plotting di hampir semua bahasa. 📊",
    factEn: "R's ggplot2 inspired plotting libraries in almost every language. 📊",
    emoji: "📊",
  },
  {
    slug: "c",
    name: "C",
    aliases: ["c lang", "c language", "bahasa c"],
    since: 1972,
    difficultyId: "Menantang — kamu mengelola memori sendiri, tapi konsepnya murni",
    difficultyEn: "Challenging — you manage memory yourself, but the concepts are pure",
    taglineId: "Ibu dari hampir semua bahasa modern dan fondasi semua sistem.",
    taglineEn: "Mother of nearly every modern language and the foundation of everything.",
    descId:
      "Bahasa terkecil dengan dampak terbesar: kernel Linux, Python interpreter, dan hampir semua sistem operasi ditulis dengan C. Belajar C = belajar bagaimana komputer benar-benar bekerja.",
    descEn:
      "The smallest language with the biggest impact: the Linux kernel, the Python interpreter, and nearly every OS are written in C. Learning C means learning how computers really work.",
    useCases: ["Sistem Operasi", "Embedded & IoT", "Kernel & Driver", "Alat Performa Tinggi"],
    frameworks: ["glibc", "Make", "CMake", "SDL"],
    careers: ["security-engineer", "backend-dev", "game-dev"],
    factId: "Unix dipindahkan ke C tahun 1973 — sejak itu sistem operasi jadi portabel. 🧱",
    factEn: "Unix was ported to C in 1973 — operating systems became portable from then on. 🧱",
    emoji: "🧱",
  },
  {
    slug: "zig",
    name: "Zig",
    aliases: ["zig"],
    since: 2016,
    difficultyId: "Menantang — eksplisit seperti C, tapi tanpa perilaku tersembunyi",
    difficultyEn: "Challenging — explicit like C, but with no hidden behavior",
    taglineId: "Penerus spiritual C: sederhana, cepat, tanpa alokasi tersembunyi.",
    taglineEn: "C's spiritual successor: simple, fast, no hidden allocations.",
    descId:
      "Bahasa sistem modern yang menggantikan C dengan cara membuat semua hal eksplisit: alokasi memori, error, dan kompilasi lintas platform (termasuk toolchain C-nya sendiri).",
    descEn:
      "A modern systems language that succeeds C by making everything explicit: memory allocation, errors, and cross-platform compilation (with its own C toolchain).",
    useCases: ["Sistem & Embedded", "CLI Tools", "WebAssembly", "Pengganti C"],
    frameworks: ["Zig std", "Zig build", "Bun (dibangun dengannya)"],
    careers: ["backend-dev", "game-dev"],
    factId: "Bun, runtime JavaScript tercepat, ditulis dengan Zig. ⚡",
    factEn: "Bun, the fastest JavaScript runtime, is written in Zig. ⚡",
    emoji: "⚡",
  },
  {
    slug: "elixir",
    name: "Elixir",
    aliases: ["elixir"],
    since: 2011,
    difficultyId: "Sedang — functional, tapi ramah dan konsisten",
    difficultyEn: "Moderate — functional, but friendly and consistent",
    taglineId: "Concurrency sejuta koneksi di atas VM Erlang, dengan sintaks modern.",
    taglineEn: "A million-connection concurrency on the Erlang VM, with modern syntax.",
    descId:
      "Berjalan di BEAM (VM Erlang) yang terkenal fault-tolerant: proses ringan, supervision tree, dan sistem live-update. Phoenix membuat web realtime terasa mudah.",
    descEn:
      "Runs on the famously fault-tolerant BEAM (Erlang VM): lightweight processes, supervision trees, and live system updates. Phoenix makes realtime web feel easy.",
    useCases: ["Web Realtime", "Sistem Terskala Besar", "Messaging & IoT", "API Toleransi Tinggi"],
    frameworks: ["Phoenix", "LiveView", "Ecto", "Oban"],
    careers: ["backend-dev"],
    factId: "WhatsApp menangani miliaran pesan per hari dengan sangat sedikit server berkat Erlang/BEAM. 💧",
    factEn: "WhatsApp handled billions of messages a day on remarkably few servers thanks to Erlang/BEAM. 💧",
    emoji: "💧",
  },
  {
    slug: "haskell",
    name: "Haskell",
    aliases: ["haskell"],
    since: 1990,
    difficultyId: "Sulit — pure functional yang mengubah cara berpikir",
    difficultyEn: "Hard — pure functional that rewires how you think",
    taglineId: "Functional murni: jika kompilernya bilang benar, biasanya benar.",
    taglineEn: "Pure functional: if the compiler says it's right, it usually is.",
    descId:
      "Bahasa yang membuat efek samping jadi eksplisit lewat sistem tipe paling kuat di industri. Banyak fitur modern (async/await, pattern matching) dipelajari dulu dari Haskell.",
    descEn:
      "A language that makes side effects explicit through the strongest type system in industry. Many modern features (async/await, pattern matching) were learned from Haskell first.",
    useCases: ["Compiler & Bahasa", "Fintech & Blockchain", "Akademik & Riset", "Domain Modeling"],
    frameworks: ["GHC", "Yesod", "Servant", "Pandoc"],
    careers: ["backend-dev", "data-scientist"],
    factId: "Facebook menggunakan Haskell untuk filter spam di sisi server. 🎓",
    factEn: "Facebook uses Haskell for its server-side spam filtering. 🎓",
    emoji: "🟣",
  },
  {
    slug: "solidity",
    name: "Solidity",
    aliases: ["solidity"],
    since: 2014,
    difficultyId: "Sedang — mirip JavaScript, tapi konsekuensinya finansial",
    difficultyEn: "Moderate — JS-like, but the stakes are financial",
    taglineId: "Bahasa smart contract yang menghidupkan Ethereum.",
    taglineEn: "The smart contract language powering Ethereum.",
    descId:
      "Dirancang khusus untuk Ethereum Virtual Machine: menulis kontrak yang menyimpan dan memindahkan nilai tanpa perantara. Bug di sini berharga mahal, jadi testing & audit adalah budayanya.",
    descEn:
      "Purpose-built for the Ethereum Virtual Machine: contracts that store and move value with no intermediary. Bugs are extremely expensive here, so testing & audits are the culture.",
    useCases: ["Smart Contract", "DeFi & NFT", "DAO & Web3", "Token Standard"],
    frameworks: ["Hardhat", "Foundry", "OpenZeppelin", "Ethers.js"],
    careers: ["backend-dev"],
    factId: "Hampir semua smart contract Ethereum ditulis dengan Solidity. ⛓️",
    factEn: "Nearly every Ethereum smart contract is written in Solidity. ⛓️",
    emoji: "⛓️",
  },
  {
    slug: "lua",
    name: "Lua",
    aliases: ["lua", "luau"],
    since: 1993,
    difficultyId: "Mudah — mungkin bahasa script paling ringkas yang ada",
    difficultyEn: "Easy — possibly the most compact scripting language there is",
    taglineId: "Bahasa skrip kecil yang menyalakan game engine dan editor di mana-mana.",
    taglineEn: "The tiny scripting language powering game engines and editors everywhere.",
    descId:
      "Dirancang untuk tertanam (embed) di aplikasi lain: <200KB, cepat, dan mudah di-binding. Roblox (Luau), Neovim, World of Warcraft, dan Defold semuanya memakainya.",
    descEn:
      "Designed to be embedded in other apps: under 200KB, fast, and easy to bind. Roblox (Luau), Neovim, World of Warcraft, and Defold all use it.",
    useCases: ["Game Scripting", "Plugin Editor (Neovim)", "Embedded & IoT", "Konfigurasi Aplikasi"],
    frameworks: ["LÖVE", "Luau", "OpenResty", "Neovim API"],
    careers: ["game-dev"],
    factId: "Namanya berarti 'bulan' dalam bahasa Portugis. 🌙",
    factEn: "Its name means 'moon' in Portuguese. 🌙",
    emoji: "🌙",
  },
  {
    slug: "scala",
    name: "Scala",
    aliases: ["scala"],
    since: 2004,
    difficultyId: "Sedang–Sulit — fusi OOP + functional di atas JVM",
    difficultyEn: "Moderate–Hard — a fusion of OOP + functional on the JVM",
    taglineId: "Bahasa big data: Apache Spark ditulis dengannya.",
    taglineEn: "The big-data language: Apache Spark is written in it.",
    descId:
      "Menggabungkan ekspresivitas functional dengan ekosistem Java. Dominan di data engineering lewat Spark, Kafka, dan Flink — dan kini lebih ramah lewat Scala 3.",
    descEn:
      "Combines functional expressiveness with the Java ecosystem. Dominant in data engineering through Spark, Kafka, and Flink — and friendlier than ever with Scala 3.",
    useCases: ["Big Data (Spark)", "Backend (Akka)", "Data Streaming", "Distributed Systems"],
    frameworks: ["Apache Spark", "Akka", "Play", "Apache Flink"],
    careers: ["data-engineer", "backend-dev"],
    factId: "Namanya dari 'scalable language' — dibuat untuk tumbuh dari skrip ke sistem besar. 🔺",
    factEn: "Its name is short for 'scalable language' — built to grow from scripts to big systems. 🔺",
    emoji: "🔺",
  },
  {
    slug: "julia",
    name: "Julia",
    aliases: ["julia"],
    since: 2012,
    difficultyId: "Sedang — terasa seperti Python, berjalan seperti C",
    difficultyEn: "Moderate — feels like Python, runs like C",
    taglineId: "Bahasa sains komputasi: prototyping cepat, eksekusi native.",
    taglineEn: "The computational science language: fast prototyping, native execution.",
    descId:
      "Menyelesaikan 'two-language problem': tulis model numerik sekali, tanpa porting ke C untuk performa. Dipakai di riset iklim, farmakologi, dan optimasi berskala besar.",
    descEn:
      "Solves the 'two-language problem': write your numerical model once, no porting to C for speed. Used in climate research, pharmacology, and large-scale optimization.",
    useCases: ["Komputasi Ilmiah", "Machine Learning", "Simulasi Numerik", "Bioinformatika"],
    frameworks: ["Flux.jl", "DataFrames.jl", "DifferentialEquations.jl", "Pluto"],
    careers: ["data-scientist", "ml-engineer"],
    factId: "Dibuat MIT dengan nama sandi 'Julia' supaya terdengar seperti nama orang. 🔬",
    factEn: "Built at MIT under the codename 'Julia' so it would sound like a person's name. 🔬",
    emoji: "🔬",
  },
  {
    slug: "gleam",
    name: "Gleam",
    aliases: ["gleam"],
    since: 2019,
    difficultyId: "Mudah–Sedang — statically typed dengan compiler yang sangat membantu",
    difficultyEn: "Easy–Moderate — statically typed with a very helpful compiler",
    taglineId: "Type safety Rust dengan kesiapan Erlang/BEAM.",
    taglineEn: "Rust-style type safety with Erlang/BEAM reliability.",
    descId:
      "Bahasa muda di atas BEAM: sistem tipe inference-nya kuat, compiler error message-nya ramah, dan bisa berinteroperasi langsung dengan Erlang dan Elixir.",
    descEn:
      "A young language on the BEAM: strong inferred type system, friendly compiler errors, and direct interoperability with Erlang and Elixir.",
    useCases: ["Web Backend", "Sistem Terdistribusi", "Type-safe BEAM", "Tooling Baru"],
    frameworks: ["Mist", "Wisp", "Lustre", "Gleam OTP"],
    careers: ["backend-dev"],
    factId: "Gleam adalah bahasa yang paling cepat tumbuh di survei Stack Overflow 2024. ✨",
    factEn: "Gleam was the fastest-growing language in the 2024 Stack Overflow survey. ✨",
    emoji: "✨",
  },
  {
    slug: "powershell",
    name: "PowerShell",
    aliases: ["powershell", "pwsh"],
    since: 2006,
    difficultyId: "Mudah dimulai — pipeline objek, bukan teks",
    difficultyEn: "Easy to start — pipelines of objects, not text",
    taglineId: "Shell otomasi lintas platform berbasis .NET.",
    taglineEn: "The cross-platform .NET-based automation shell.",
    descId:
      "Bukan shell biasa: pipeline-nya mengalirkan objek terstruktur, bukan teks, sehingga otomasi Windows, Azure, dan administrasi sistem jadi jauh lebih kuat dan aman.",
    descEn:
      "Not your average shell: pipelines stream structured objects, not text, making Windows, Azure, and sysadmin automation far more powerful and safe.",
    useCases: ["Otomasi Windows", "Cloud (Azure)", "Administrasi Sistem", "CI/CD Scripting"],
    frameworks: ["Az module", "Pester", "PSReadLine", ".NET SDK"],
    careers: ["devops-engineer", "cloud-engineer"],
    factId: "Open source sejak 2016 dan berjalan di Linux dan macOS juga. 🖥️",
    factEn: "Open sourced in 2016 — it runs on Linux and macOS too. 🖥️",
    emoji: "🖥️",
  },
];

// ── Career profiles ─────────────────────────────────────────────────────

export interface CareerProfile {
  slug: string;
  nameId: string;
  nameEn: string;
  aliases: string[]; // strong mentions (weight 2)
  interests: string[]; // weak signals (weight 1)
  descId: string;
  descEn: string;
  outlookId: string;
  outlookEn: string;
  skills: string[];
  langs: string[]; // language profile slugs
  categories: string[]; // catalog category slugs for tool matching
  tags: string[]; // catalog tags for tool matching
  roadmapId: string[];
  roadmapEn: string[];
  stackSlug?: string;
  emoji: string;
}

export const CAREERS: CareerProfile[] = [
  {
    slug: "frontend-dev",
    nameId: "Frontend Developer",
    nameEn: "Frontend Developer",
    aliases: ["frontend", "front end", "front-end", "fe dev", "ui developer"],
    interests: ["desain", "design", "ui", "ux", "animasi", "tampilan", "css", "warna"],
    descId:
      "Membangun bagian aplikasi yang dilihat dan disentuh pengguna: tampilan, interaksi, animasi, dan aksesibilitas. Jembatan antara desain dan teknologi — hasil kerjamu langsung terlihat.",
    descEn:
      "Builds the part of the app users see and touch: layout, interactions, animation, and accessibility. The bridge between design and engineering — your work is instantly visible.",
    outlookId:
      "Permintaan stabil di hampir semua perusahaan yang punya produk digital; portofolio visual sangat dihargai.",
    outlookEn:
      "Steady demand at almost every company with a digital product; a visual portfolio counts a lot.",
    skills: ["HTML & CSS", "JavaScript/TypeScript", "React/Vue", "Responsive Design", "Aksesibilitas (a11y)", "Git"],
    langs: ["javascript", "typescript"],
    categories: ["frontend", "css", "color", "design"],
    tags: ["react", "css", "ui", "tailwind", "components", "animation"],
    roadmapId: [
      "Kuasai HTML & CSS — layout, flexbox, grid, responsive.",
      "Pelajari JavaScript modern (ES6+) dan DOM.",
      "Lanjut ke framework: React atau Vue + Tailwind CSS.",
      "Bangun 3–5 proyek portofolio, pelajari Git & deploy ke Vercel/Netlify.",
    ],
    roadmapEn: [
      "Master HTML & CSS — layout, flexbox, grid, responsive.",
      "Learn modern JavaScript (ES6+) and the DOM.",
      "Move on to a framework: React or Vue + Tailwind CSS.",
      "Build 3–5 portfolio projects; learn Git & deploy to Vercel/Netlify.",
    ],
    stackSlug: "react",
    emoji: "🎨",
  },
  {
    slug: "backend-dev",
    nameId: "Backend Developer",
    nameEn: "Backend Developer",
    aliases: ["backend", "back end", "back-end", "be dev", "server side", "api developer"],
    interests: ["logika", "logic", "server", "api", "database", "basis data", "algoritma"],
    descId:
      "Merancang logika di balik layar: API, database, autentikasi, dan performa server. Profesi inti dari semua produk digital — layanan yang kamu bangun dipakai ribuan aplikasi.",
    descEn:
      "Designs the behind-the-scenes logic: APIs, databases, authentication, and server performance. The core role of every digital product — the services you build power thousands of apps.",
    outlookId:
      "Salah satu profesi dengan lowongan terbanyak; pilihan bahasa sangat fleksibel (Go, Python, Java, PHP, Node.js).",
    outlookEn:
      "One of the most in-demand roles; language choice is very flexible (Go, Python, Java, PHP, Node.js).",
    skills: ["SQL & Database", "API Design (REST/GraphQL)", "Autentikasi & Keamanan", "Caching", "Git", "Docker dasar"],
    langs: ["python", "java", "go", "php", "c#", "javascript", "kotlin", "rust"],
    categories: ["backend", "api", "database", "sql"],
    tags: ["api", "rest", "orm", "framework", "auth", "graphql"],
    roadmapId: [
      "Pilih satu bahasa backend (Python/Go/Node.js/PHP) dan kuasai dasarnya.",
      "Belajar SQL & desain database — relasi, index, normalisasi.",
      "Bangun REST API lengkap: auth, validasi, error handling, testing.",
      "Pelajari Docker, caching (Redis), dan deploy ke cloud.",
    ],
    roadmapEn: [
      "Pick one backend language (Python/Go/Node.js/PHP) and master the basics.",
      "Learn SQL & database design — relations, indexes, normalization.",
      "Build a complete REST API: auth, validation, error handling, testing.",
      "Learn Docker, caching (Redis), and cloud deployment.",
    ],
    emoji: "🛠️",
  },
  {
    slug: "fullstack-dev",
    nameId: "Full-Stack Developer",
    nameEn: "Full-Stack Developer",
    aliases: ["fullstack", "full stack", "full-stack"],
    interests: ["semua", "web", "produk", "startup"],
    descId:
      "Menghandle frontend sekaligus backend — dari UI sampai database. Sangat dicari di startup karena satu orang bisa menuntaskan fitur dari ujung ke ujung.",
    descEn:
      "Handles frontend and backend at once — UI through database. Highly sought after in startups because one person can ship a feature end-to-end.",
    outlookId:
      "Paling fleksibel untuk freelance dan startup; jalur cepat untuk memahami produk secara utuh.",
    outlookEn:
      "The most flexible path for freelancing and startups; a fast way to understand products holistically.",
    skills: ["Frontend (React/Next.js)", "Backend (Node.js/Python)", "SQL & NoSQL", "REST API", "Git & Deploy", "Basic DevOps"],
    langs: ["javascript", "typescript", "python", "php"],
    categories: ["frontend", "backend", "database", "api"],
    tags: ["fullstack", "next.js", "react", "orm", "api"],
    roadmapId: [
      "Mulai dari frontend: HTML, CSS, JavaScript, lalu React.",
      "Tambahkan backend: Node.js/Express atau Python/FastAPI.",
      "Pelajari database (PostgreSQL + Prisma/Drizzle) dan autentikasi.",
      "Rampungkan dengan deploy full-stack: Vercel, Railway, atau VPS.",
    ],
    roadmapEn: [
      "Start frontend: HTML, CSS, JavaScript, then React.",
      "Add a backend: Node.js/Express or Python/FastAPI.",
      "Learn databases (PostgreSQL + Prisma/Drizzle) and authentication.",
      "Finish with full-stack deploys: Vercel, Railway, or a VPS.",
    ],
    stackSlug: "nextjs",
    emoji: "🧩",
  },
  {
    slug: "mobile-dev",
    nameId: "Mobile Developer",
    nameEn: "Mobile Developer",
    aliases: ["mobile", "mobile dev", "android", "ios developer", "aplikasi mobile", "aplikasi hp"],
    interests: ["android", "ios", "aplikasi", "smartphone", "flutter"],
    descId:
      "Membangun aplikasi yang hidup di kantong pengguna. Pilih jalur native (Kotlin untuk Android, Swift untuk iOS) atau lintas platform dengan Flutter / React Native.",
    descEn:
      "Builds the apps living in users' pockets. Go native (Kotlin for Android, Swift for iOS) or cross-platform with Flutter / React Native.",
    outlookId:
      "Ekosistem app store terus tumbuh; spesialis mobile dengan pengalaman rilis ke production sangat dihargai.",
    outlookEn:
      "App store ecosystems keep growing; mobile devs with production release experience are highly valued.",
    skills: ["Kotlin atau Swift", "Flutter / React Native", "UI/UX Mobile", "REST API", "State Management", "App Store Rilis"],
    langs: ["kotlin", "swift", "dart", "javascript"],
    categories: ["mobile"],
    tags: ["mobile", "flutter", "react native", "android"],
    roadmapId: [
      "Pilih jalur: native (Kotlin/Swift) atau cross-platform (Flutter).",
      "Pelajari komponen UI, layout, dan navigasi aplikasi.",
      "Konsumsi REST API & kelola state aplikasi.",
      "Rilis minimal satu app ke Play Store / App Store.",
    ],
    roadmapEn: [
      "Pick a path: native (Kotlin/Swift) or cross-platform (Flutter).",
      "Learn UI components, layout, and app navigation.",
      "Consume REST APIs & manage app state.",
      "Ship at least one app to the Play Store / App Store.",
    ],
    stackSlug: "flutter",
    emoji: "📱",
  },
  {
    slug: "data-scientist",
    nameId: "Data Scientist",
    nameEn: "Data Scientist",
    aliases: ["data scientist", "data science", "ilmuwan data"],
    interests: ["matematika", "statistik", "angka", "data", "visualisasi", "riset"],
    descId:
      "Mengubah data mentah jadi keputusan bisnis: statistik, visualisasi, dan model prediktif. Kombinasi langka antara kemampuan analisis, coding, dan storytelling.",
    descEn:
      "Turns raw data into business decisions: statistics, visualization, and predictive models. A rare mix of analysis, coding, and storytelling.",
    outlookId:
      "Salah satu profesi dengan gaji tertinggi di bidang data; dibutuhkan di hampir semua industri.",
    outlookEn: "One of the highest-paying data roles; needed across nearly every industry.",
    skills: ["Python", "SQL", "Statistika", "Pandas & NumPy", "Visualisasi Data", "Machine Learning dasar"],
    langs: ["python", "r", "sql"],
    categories: ["ai", "data-formats"],
    tags: ["analytics", "data", "notebook", "visualization"],
    roadmapId: [
      "Pelajari Python (Pandas, NumPy) dan SQL dengan sungguh-sungguh.",
      "Bangun fondasi statistika: distribusi, korelasi, uji hipotesis.",
      "Latih diri dengan dataset publik (Kaggle) dan buat visualisasi.",
      "Pelajari machine learning dasar: regresi, klasifikasi, clustering.",
    ],
    roadmapEn: [
      "Learn Python (Pandas, NumPy) and SQL seriously.",
      "Build statistics foundations: distributions, correlation, hypothesis testing.",
      "Practice on public datasets (Kaggle) and create visualizations.",
      "Learn basic ML: regression, classification, clustering.",
    ],
    emoji: "🧪",
  },
  {
    slug: "data-analyst",
    nameId: "Data Analyst",
    nameEn: "Data Analyst",
    aliases: ["data analyst", "analis data", "data analytics", "analyst"],
    interests: ["laporan", "excel", "bisnis", "dashboard", "insight", "data"],
    descId:
      "Menjawab pertanyaan bisnis dengan data: query SQL, dashboard, dan laporan yang menjelaskan 'apa yang terjadi dan mengapa'. Gerbang paling ramah untuk masuk dunia data.",
    descEn:
      "Answers business questions with data: SQL queries, dashboards, and reports explaining 'what happened and why'. The friendliest gateway into the data world.",
    outlookId:
      "Pintu masuk paling umum ke karier data; bisa berkembang ke data science atau analytics engineering.",
    outlookEn: "The most common entry into data careers; grows toward data science or analytics engineering.",
    skills: ["SQL", "Excel / Spreadsheet", "Tableau / Looker", "Statistika dasar", "Python dasar"],
    langs: ["sql", "python", "r"],
    categories: ["database", "sql", "ai"],
    tags: ["analytics", "sql", "dashboard", "visualization", "bi"],
    roadmapId: [
      "Kuasai SQL — join, agregasi, window function.",
      "Tajamkan Excel/Spreadsheet, lalu belajar BI tool (Looker/Tableau).",
      "Pelajari statistika dasar dan storytelling dengan data.",
      "Bangun dashboard dari dataset nyata sebagai portofolio.",
    ],
    roadmapEn: [
      "Master SQL — joins, aggregation, window functions.",
      "Sharpen Excel/Spreadsheets, then learn a BI tool (Looker/Tableau).",
      "Learn basic statistics and data storytelling.",
      "Build a dashboard from a real dataset as a portfolio piece.",
    ],
    emoji: "📈",
  },
  {
    slug: "data-engineer",
    nameId: "Data Engineer",
    nameEn: "Data Engineer",
    aliases: ["data engineer", "rekayasa data"],
    interests: ["pipeline", "big data", "etl", "infrastruktur", "data"],
    descId:
      "Membangun pipa-pipa yang mengalirkan data dari sumber ke gudang data — bersih, andal, dan skalabel. Fondasi teknis bagi data scientist dan analyst.",
    descEn:
      "Builds the pipelines moving data from sources to warehouses — clean, reliable, and scalable. The technical foundation for data scientists and analysts.",
    outlookId:
      "Permintaan naik cepat seiring adopsi data besar; gaji kompetitif, persaingan masih sehat.",
    outlookEn: "Demand rises fast with big-data adoption; competitive pay, still healthy competition.",
    skills: ["Python", "SQL lanjutan", "Airflow / ETL", "Spark", "Data Warehouse", "Docker & Cloud"],
    langs: ["python", "sql", "java", "scala"],
    categories: ["database", "devops", "cloud"],
    tags: ["etl", "streaming", "warehouse", "bigquery", "kafka"],
    roadmapId: [
      "Kuasai Python dan SQL tingkat lanjut.",
      "Pelajari konsep ETL/ELT dan orkestrasi (Airflow).",
      "Kenal data warehouse (BigQuery, Snowflake) dan Spark.",
      "Bangun pipeline end-to-end dari API → gudang data → dashboard.",
    ],
    roadmapEn: [
      "Master Python and advanced SQL.",
      "Learn ETL/ELT concepts and orchestration (Airflow).",
      "Get to know data warehouses (BigQuery, Snowflake) and Spark.",
      "Build an end-to-end pipeline: API → warehouse → dashboard.",
    ],
    emoji: "🚰",
  },
  {
    slug: "ml-engineer",
    nameId: "Machine Learning / AI Engineer",
    nameEn: "Machine Learning / AI Engineer",
    aliases: [
      "machine learning", "ml engineer", "ai engineer", "kecerdasan buatan",
      "artificial intelligence", "deep learning", "ai/ml", "ml/ai",
    ],
    interests: ["ai", "kecerdasan buatan", "robot", "robotik", "neural", "llm", "chatgpt"],
    descId:
      "Membangun dan men-deploy model AI: dari rekomendasi produk sampai LLM agent. Memadukan software engineering dengan machine learning pada skala produksi.",
    descEn:
      "Builds and deploys AI models: from product recommendations to LLM agents. Blends software engineering with production-scale machine learning.",
    outlookId:
      "Bidang paling panas saat ini; profesi dengan kombinasi skill ML + engineering sangat langka.",
    outlookEn: "The hottest field right now; ML + engineering hybrids are extremely rare.",
    skills: ["Python", "PyTorch / TensorFlow", "Matematika ML", "MLOps", "Vector Database", "LLM & Prompting"],
    langs: ["python"],
    categories: ["ai"],
    tags: ["llm", "ai", "vector", "agent", "inference", "embeddings"],
    roadmapId: [
      "Fondasi: Python + matematika (linear algebra, kalkulus, probabilitas).",
      "Pelajari ML klasik lewat scikit-learn sebelum deep learning.",
      "Dalami deep learning dengan PyTorch; buat proyek nyata.",
      "Pelajari MLOps: deploy model, monitoring, dan ekosistem LLM.",
    ],
    roadmapEn: [
      "Foundations: Python + math (linear algebra, calculus, probability).",
      "Learn classical ML with scikit-learn before deep learning.",
      "Go deep with PyTorch; build real projects.",
      "Learn MLOps: model deployment, monitoring, and the LLM ecosystem.",
    ],
    emoji: "🤖",
  },
  {
    slug: "devops-engineer",
    nameId: "DevOps / SRE Engineer",
    nameEn: "DevOps / SRE Engineer",
    aliases: ["devops", "sre", "site reliability", "sysadmin", "system administrator", "administrator sistem"],
    interests: ["server", "linux", "jaringan", "network", "infrastruktur", "otomasi", "cloud"],
    descId:
      "Menghubungkan development dan operations: pipeline CI/CD, container, infrastruktur sebagai kode, dan monitoring. Penjaga agar aplikasi tetap hidup 24/7.",
    descEn:
      "Bridges development and operations: CI/CD pipelines, containers, infrastructure as code, and monitoring. The guardian keeping apps alive 24/7.",
    outlookId:
      "Lowongan selalu ada di perusahaan dengan sistem online; skill-nya juga mempermudah karier cloud engineer.",
    outlookEn: "Always in demand at companies with online systems; the skills pivot easily to cloud engineering.",
    skills: ["Linux & Networking", "Docker & Kubernetes", "CI/CD (GitHub Actions)", "Terraform / IaC", "Monitoring", "AWS/GCP"],
    langs: ["bash", "python", "go"],
    categories: ["devops", "cloud", "monitoring", "git"],
    tags: ["ci-cd", "docker", "kubernetes", "iac", "monitoring", "terraform"],
    roadmapId: [
      "Kuasai Linux, jaringan dasar, dan shell scripting.",
      "Pelajari Git, lalu Docker — container adalah bahasa wajibnya.",
      "Bangun pipeline CI/CD dan infrastruktur sebagai kode (Terraform).",
      "Tambahkan monitoring & observability (Prometheus, Grafana).",
    ],
    roadmapEn: [
      "Master Linux, basic networking, and shell scripting.",
      "Learn Git, then Docker — containers are the lingua franca.",
      "Build CI/CD pipelines and infrastructure as code (Terraform).",
      "Add monitoring & observability (Prometheus, Grafana).",
    ],
    stackSlug: "devops",
    emoji: "♾️",
  },
  {
    slug: "cloud-engineer",
    nameId: "Cloud Engineer",
    nameEn: "Cloud Engineer",
    aliases: ["cloud engineer", "aws engineer", "cloud architect", "arsitek cloud"],
    interests: ["cloud", "aws", "azure", "gcp", "infrastruktur", "server"],
    descId:
      "Merancang dan mengelola infrastruktur di cloud: compute, storage, jaringan, dan biaya. Banyak bersinggungan dengan DevOps, tapi fokusnya arsitektur platform.",
    descEn:
      "Designs and manages cloud infrastructure: compute, storage, networking, and cost. Overlaps with DevOps but focuses on platform architecture.",
    outlookId:
      "Sertifikasi (AWS/GCP/Azure) sangat dihargai dan langsung terasa di gaji.",
    outlookEn: "Certifications (AWS/GCP/Azure) are highly valued and directly reflected in pay.",
    skills: ["AWS / GCP / Azure", "Networking", "Terraform", "Keamanan Cloud", "Kubernetes", "Cost Optimization"],
    langs: ["bash", "python", "go"],
    categories: ["cloud", "devops", "monitoring"],
    tags: ["cloud", "iac", "terraform", "serverless", "kubernetes"],
    roadmapId: [
      "Pahami dasar cloud: compute, storage, network, IAM.",
      "Pilih satu provider (AWS paling banyak lowongan) dan dalami.",
      "Otomasi dengan Terraform dan CLI scripting.",
      "Ambil sertifikasi associate sebagai validasi.",
    ],
    roadmapEn: [
      "Understand cloud basics: compute, storage, network, IAM.",
      "Pick one provider (AWS has the most openings) and go deep.",
      "Automate with Terraform and CLI scripting.",
      "Take an associate certification for validation.",
    ],
    stackSlug: "devops",
    emoji: "☁️",
  },
  {
    slug: "game-dev",
    nameId: "Game Developer",
    nameEn: "Game Developer",
    aliases: ["game developer", "game dev", "pengembang game", "pembuat game", "gamedev"],
    interests: ["game", "gaming", "unity", "unreal", "3d", "grafis"],
    descId:
      "Membangun dunia interaktif: gameplay, fisika, grafis, dan audio. Bisa lewat engine (Unity dengan C#, Unreal dengan C++) atau web dengan JS/TypeScript.",
    descEn:
      "Builds interactive worlds: gameplay, physics, graphics, and audio. Via engines (Unity with C#, Unreal with C++) or the web with JS/TypeScript.",
    outlookId:
      "Kompetitif tapi berkembang lewat indie, mobile, dan game web; portofolio game jadi kunci utama.",
    outlookEn: "Competitive but growing through indie, mobile, and web games; a game portfolio is the key.",
    skills: ["C# / C++", "Unity / Unreal / Godot", "Matematika 3D", "Physics & Animation", "Game Design"],
    langs: ["c#", "c++", "rust", "javascript"],
    categories: ["programming", "design", "media"],
    tags: ["game", "graphics", "3d", "animation"],
    roadmapId: [
      "Pilih engine: Unity (C#) paling ramah pemula, atau Godot (gratis).",
      "Pelajari siklus gameplay: input, fisika, collision, state.",
      "Salin game sederhana (pong, platformer) untuk memahami pola.",
      "Rampungkan dan rilis satu game kecil — lengkap sampai selesai.",
    ],
    roadmapEn: [
      "Pick an engine: Unity (C#) is beginner-friendly, or Godot (free).",
      "Learn the gameplay loop: input, physics, collision, state.",
      "Clone simple games (pong, platformer) to absorb the patterns.",
      "Finish and ship one small game — all the way to completion.",
    ],
    emoji: "🕹️",
  },
  {
    slug: "security-engineer",
    nameId: "Cyber Security Engineer",
    nameEn: "Cyber Security Engineer",
    aliases: [
      "security", "cyber security", "cybersecurity", "keamanan", "pentest",
      "penetration tester", "ethical hacker", "hacker",
    ],
    interests: ["hacking", "keamanan", "cyber", "kriptografi", "forensik"],
    descId:
      "Melindungi sistem dari serangan: penetration testing, audit keamanan, dan respons insiden. Mencoba menembus sistem sebelum orang jahat melakukannya.",
    descEn:
      "Protects systems from attacks: penetration testing, security audits, and incident response. Breaking systems before the bad guys do.",
    outlookId:
      "Kekurangan talenta global; sertifikasi (OSCP, CEH) dan CTF track record sangat menolong.",
    outlookEn: "Global talent shortage; certifications (OSCP, CEH) and CTF records help a lot.",
    skills: ["Networking", "Linux", "Python/Bash", "Web Security (OWASP)", "Tools Kali", "Kriptografi dasar"],
    langs: ["python", "bash", "c"],
    categories: ["security", "encoding"],
    tags: ["security", "ssl", "scanning", "audit", "auth", "pentest"],
    roadmapId: [
      "Kuasai jaringan & Linux — fondasi segala hal di security.",
      "Pelajari web security: OWASP Top 10, XSS, SQL injection.",
      "Latih di platform legal: HackTheBox, TryHackMe, CTF.",
      "Spesialisasi: pentest, SOC/blue team, atau appsec.",
    ],
    roadmapEn: [
      "Master networking & Linux — the foundation of everything security.",
      "Learn web security: OWASP Top 10, XSS, SQL injection.",
      "Practice on legal platforms: HackTheBox, TryHackMe, CTFs.",
      "Specialize: pentest, SOC/blue team, or appsec.",
    ],
    emoji: "🛡️",
  },
  {
    slug: "qa-engineer",
    nameId: "QA / Automation Engineer",
    nameEn: "QA / Automation Engineer",
    aliases: ["qa", "quality assurance", "tester", "software tester", "qa engineer", "penjamin mutu"],
    interests: ["mengetes", "testing", "detail", "kualitas", "bug"],
    descId:
      "Menjaga kualitas perangkat lunak: merancang skenario uji dan mengotomasinya supaya bug tertangkap sebelum sampai ke pengguna. Detail-oriented tapi sangat teknis.",
    descEn:
      "Guards software quality: designs test scenarios and automates them so bugs are caught before users see them. Detail-oriented yet deeply technical.",
    outlookId:
      "Gerbang masuk industri yang solid; QA automation bertransisi mulus ke SDET atau developer.",
    outlookEn: "A solid industry entry point; QA automation transitions smoothly into SDET or developer roles.",
    skills: ["Testing manual & otomasi", "Selenium / Playwright / Cypress", "API testing", "Python/JS dasar", "CI/CD"],
    langs: ["javascript", "python", "java"],
    categories: ["testing", "api"],
    tags: ["testing", "e2e", "automation", "mocking"],
    roadmapId: [
      "Pahami dasar testing: unit, integration, E2E.",
      "Belajar menulis test otomatis dengan Playwright atau Cypress.",
      "Otomasi API testing (Postman/REST Client) dan masukkan ke CI.",
      "Pelajari test pyramid dan strategi pengujian aplikasi nyata.",
    ],
    roadmapEn: [
      "Understand testing basics: unit, integration, E2E.",
      "Learn to write automated tests with Playwright or Cypress.",
      "Automate API testing (Postman/REST clients) and wire it into CI.",
      "Study the test pyramid and strategy on a real application.",
    ],
    emoji: "🐞",
  },
];
