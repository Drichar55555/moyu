'use strict';
const MoyuCourses = Object.freeze([
  {
    id: 'honglou-close-reading',
    title: '小观红楼：红楼精读系列课程一',
    subtitle: '老卢领读《红楼梦》前十回',
    image: 'assets/courses/reading.svg',
    category: '文学阅读',
    priceCents: 360000,
    sourceURL: 'https://mp.weixin.qq.com/s/K1M2nQ2AujSx0RNLBui08w',
    delivery: {mode:'网络小班',lessonCount:36,minutesPerLesson:60},
    teacher: {
      name: '卢家宁（老卢）',
      bio: '历史专业背景，有十五年地理教学经历，也从事摄影、书法与写作。阅读《红楼梦》近二十年，通读近十次，本期带领学生一起细读原著。'
    },
    arrangements: [
      {label:'上课时间',value:'周末上课，每次两节，共18次课。'},
      {label:'班级人数',value:'6人成班，最多12人。'},
      {label:'开课日期',value:'达到成班人数后开课，具体日期待定。'},
      {label:'阅读范围',value:'《红楼梦》约第1—10回。'},
      {label:'课程费用',value:'每人100元/节，36节共3600元。'}
    ],
    description: '以《红楼梦》原文为基础，结合故事、人物性格与心理活动展开阅读，并联系相关历史和文化知识。本期阅读约前十回，侧重细读、讨论与个人体会。',
    outcomes: [
      {title:'理解原著',text:'回到文本梳理故事与细节，建立对本期阅读内容的整体认识。'},
      {title:'认识人物',text:'从言行、性格与情感关系出发，讨论人物的心理和处境。'},
      {title:'拓展阅读方法',text:'结合历史文化背景理解文本，在讨论中整理自己的阅读体会。'}
    ],
    lessons: [],
    outline: [
      {title:'原著细读',text:'本期覆盖约第1—10回，围绕文字与故事进行细读。'},
      {title:'人物理解',text:'结合人物的行为和心理活动，讨论性格与命运。'},
      {title:'情感关系',text:'梳理故事中的情感联系，理解人物之间的互动。'},
      {title:'阅读与文化背景',text:'联系相关历史、文化知识，适当介绍红学常识，建立阅读思路。'}
    ],
    audience: ['14周岁以上的中学生。']
  },
  {
    id: 'thinking-demo',
    title: '独立思考，从一个好问题开始',
    subtitle: '拆解观点、辨析证据，建立自己的判断',
    image: 'assets/courses/thinking.svg',
    category: '哲学思辨',
    priceCents: 19900,
    description: '从一段文字、一则观点、一次日常讨论出发，练习提问、辨析与表达。不是收集标准答案，而是建立一套可以反复使用的思考方法。',
    outcomes: [
      {title:'把问题问清楚',text:'找到模糊概念与隐藏前提，把一个宽泛的疑问变成可以讨论的问题。'},
      {title:'把观点看明白',text:'分清事实、解释与立场，追问证据从哪里来、结论是否站得住。'},
      {title:'把想法说完整',text:'用清晰的结构表达判断，为反例、不确定与不同意见留出位置。'}
    ],
    lessons: [
      {title:'先问：我们究竟在讨论什么？',minutes:18,text:'识别问题里的概念与边界。练习：把「读书有没有用」改写成三个更具体的问题。'},
      {title:'事实，还是一种解释？',minutes:20,text:'区分可核查的信息与个人判断。练习：标注一段评论里的事实、推断和价值立场。'},
      {title:'一个观点，凭什么成立？',minutes:22,text:'拆解主张、证据与推理，为一个自己赞同的观点写出论证链。'},
      {title:'当直觉替我们做了决定',minutes:20,text:'认识确认偏误与常见推理陷阱，主动寻找能挑战自己判断的反例。'},
      {title:'如何与不同意见相处？',minutes:20,text:'先准确理解，再尝试回应，用对方认可的方式复述一个不同意见。'},
      {title:'写下一个属于自己的判断',minutes:20,text:'将问题、证据与边界组织成一份有结论、也承认局限的思考札记。'}
    ],
    audience: ['希望面对信息时，想清楚再下判断的人。','希望从记住内容走向提出问题的阅读者。','希望更清晰地讨论与表达自己的人。']
  },
  {
    id: 'reading-demo',
    title: '深度阅读：读懂一本书',
    subtitle: '从划线摘抄，到真正理解与建立连接',
    image: 'assets/courses/reading.svg',
    category: '文学阅读',
    priceCents: 12900,
    description: '把阅读变成一次主动的对话。以一本书为起点，练习寻找结构、理解语境、提出问题，再用自己的语言重述与回应。',
    outcomes: [
      {title:'读出结构',text:'识别作者的问题、章节之间的连接，以及文本如何组织论述。'},
      {title:'读出疑问',text:'在赞同与反对之前，先定位没有理解的地方，提出可追问的问题。'},
      {title:'留下自己的回应',text:'用一张阅读地图和一则短评，整理理解并连接个人经验。'}
    ],
    lessons: [
      {title:'打开书之前：带着什么问题读？',minutes:20,text:'区分阅读目的，用目录、序言和关键词建立初步阅读地图。'},
      {title:'从段落走向整本书',minutes:20,text:'追踪核心概念与论述转折，绘制章节之间的关系。'},
      {title:'让笔记成为思考，而不只是摘抄',minutes:20,text:'将摘录、转述、疑问和回应分开记录，给笔记留下自己的声音。'},
      {title:'合上书之后：写一则有依据的短评',minutes:20,text:'用文本证据支持自己的理解，完成一份简短的阅读回应。'}
    ],
    audience: ['读过不少书，却很难说清收获的人。','希望建立阅读笔记方法的人。','想从碎片化阅读走向完整理解的人。']
  },
  {
    id: 'history-demo',
    title: '历史的另一面：学会看见语境',
    subtitle: '从史料与叙事出发，不用今天代替过去',
    image: 'assets/courses/history.svg',
    category: '历史人文',
    priceCents: 16900,
    description: '历史不只有结论。通过史料、时间线与不同叙事的比较，练习把一个事件放回当时的条件，理解人的选择及其局限。',
    outcomes: [
      {title:'区分史料与叙事',text:'关注材料的作者、写作目的与流传过程，不把单一描述当作全部事实。'},
      {title:'放回当时的语境',text:'沿着时间、制度与生活条件，理解事件发生时的选择空间。'},
      {title:'比较不同的解释',text:'从多个视角阅读同一事件，标记解释之间的相同与差异。'}
    ],
    lessons: [
      {title:'我们从哪里知道过去？',minutes:22,text:'认识不同类型的史料，练习追问一份材料的来源与立场。'},
      {title:'时间线之外：还要知道什么？',minutes:22,text:'将事件与制度、技术及日常生活联系，补全背景地图。'},
      {title:'同一件事，为什么有不同讲法？',minutes:22,text:'比较两段叙事，辨认材料选择与解释框架的不同。'},
      {title:'试着写一段有边界的历史解释',minutes:24,text:'以材料为依据组织叙述，并明确哪些是事实、哪些是推测。'}
    ],
    audience: ['喜欢历史，但不满足于记住事件的人。','希望更审慎地理解史料与故事的人。','愿意从不同视角看待过去的人。']
  },
  {
    id: 'philosophy-demo',
    title: '日常生活里的哲学课',
    subtitle: '从自由、幸福与选择，重新理解自己',
    image: 'assets/courses/philosophy.svg',
    category: '哲学思辨',
    priceCents: 15900,
    description: '哲学也可以从日常生活开始。围绕自由、幸福和责任，将抽象概念转化为可以讨论的问题，在具体处境中练习思辨。',
    outcomes: [
      {title:'辨认生活里的概念',text:'发现自由、幸福和责任等词在不同情境中的含义。'},
      {title:'练习思想实验',text:'借助假设场景检验直觉，看看自己的判断是否一致。'},
      {title:'理解选择的边界',text:'在不同价值之间展开讨论，不用一句口号替代复杂处境。'}
    ],
    lessons: [
      {title:'什么才算自由的选择？',minutes:20,text:'比较外在限制与内在愿望，给一个日常选择画出条件图。'},
      {title:'幸福，能不能只用快乐衡量？',minutes:20,text:'借助思想实验，讨论快乐、意义与生活体验的关系。'},
      {title:'为自己负责，意味着什么？',minutes:20,text:'从具体处境出发，辨认个人选择与环境因素的关系。'},
      {title:'与不确定共处',minutes:20,text:'为一个没有标准答案的问题，写下自己的理由与保留。'}
    ],
    audience: ['对日常生活中的大问题感到好奇的人。','想入门哲学但不知从哪里开始的人。','愿意检验直觉、倾听不同理解的人。']
  },
  {
    id: 'writing-demo',
    title: '把想法写清楚',
    subtitle: '用结构、例子与修改，让表达更有力量',
    image: 'assets/courses/writing.svg',
    category: '写作表达',
    priceCents: 9900,
    description: '从一段想说却说不清的话开始，学习聚焦主题、安排结构、选取例子和反复修改。用一篇短文完成一次从想法到表达的练习。',
    outcomes: [
      {title:'找到一个中心',text:'把许多零散想法收束为一个清晰问题，知道文章究竟要说什么。'},
      {title:'安排表达顺序',text:'围绕读者需要的信息组织结构，让例子与观点相互支持。'},
      {title:'学会修改',text:'用检查清单删去含混和重复，让自己的意思更准确。'}
    ],
    lessons: [
      {title:'动笔之前，先确定要说什么',minutes:18,text:'围绕读者与场景，将一个模糊想法收束为核心句。'},
      {title:'让段落之间有一条线',minutes:20,text:'练习用提纲安排信息，检查段落之间的推进关系。'},
      {title:'用具体的例子支持观点',minutes:22,text:'把抽象判断落在可理解的场景中，避免用修辞替代理由。'},
      {title:'一篇文章，从修改开始',minutes:20,text:'从结构、句子和用词三个层面，完成一篇短文的修订。'}
    ],
    audience: ['脑中有想法，但动笔时容易卡住的人。','希望改善日常文字表达的人。','愿意通过短篇练习建立写作习惯的人。']
  },
  {
    id: 'society-demo',
    title: '看见城市，也看见人',
    subtitle: '用社会观察的方法，重新认识身边的生活',
    image: 'assets/courses/society.svg',
    category: '社会观察',
    priceCents: 14900,
    description: '熟悉的街道里也藏着值得追问的问题。从步行观察、记录与比较入手，理解空间怎样影响生活，也学习尊重观察对象的隐私与经验。',
    outcomes: [
      {title:'从熟悉里发现问题',text:'关注日常空间与行为模式，将直觉印象转成具体观察问题。'},
      {title:'留下可比较的记录',text:'区分观察与推断，用时间、位置和细节支持描述。'},
      {title:'理解不同人的经验',text:'留意谁被看见、谁被忽略，不把个人经验当作普遍事实。'}
    ],
    lessons: [
      {title:'从一次散步开始',minutes:20,text:'选择一条熟悉路线，练习带着明确问题观察街道与空间。'},
      {title:'怎样记录，而不是急着判断？',minutes:20,text:'将看到的细节与自己的解释分开，整理一份观察札记。'},
      {title:'同一个空间，不同人的生活',minutes:20,text:'比较不同时段和使用者的经验，讨论观察的边界与隐私。'},
      {title:'写一份小小的城市观察报告',minutes:20,text:'将问题、记录与解释组织成短文，标注仍需验证的部分。'}
    ],
    audience: ['对城市与日常生活感兴趣的人。','希望练习观察和记录的人。','愿意理解不同生活经验的人。']
  }
].map(course=>Object.freeze(course)));
if(typeof module!=='undefined'&&module.exports)module.exports=MoyuCourses;
if(typeof window!=='undefined')window.MoyuCourses=MoyuCourses;
