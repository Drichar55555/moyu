'use strict';
const MoyuTeam=Object.freeze([
  {
    id:'wang-daxi',name:'王大溪',role:'CEO',example:true,
    portrait:'assets/team/wang-daxi.jpg',
    mobilePortrait:'assets/team/wang-daxi-mobile.jpg',
    backdrop:'assets/team/wang-daxi-wall.jpg',
    croppedPortrait:true,
    motto:'把值得做的事，认真做下去。',
    experience:'曾参与内容项目的策划与团队协作，从梳理想法、确定方向到推进落地，逐步积累了组织项目的经验。关注不同分工之间的配合，也在持续学习如何让一个想法成为可以长期坚持的事情。'
  },
  {
    id:'xiao-jingyan',name:'肖景妍',role:'COO',example:true,
    motto:'让每一份想法，都有落地的路径。',
    experience:'曾参与活动筹备、任务协调与日常运营，在一次次执行中整理流程、跟进进度，并复盘出现的问题。习惯把复杂的目标拆成具体的小事，让参与者知道下一步可以做什么。'
  },
  {
    id:'zhang-runcheng',name:'张润铖',role:'信息技术总监',example:true,
    motto:'好的技术，让复杂留在背后。',
    experience:'曾参与网站原型、页面交互与工具开发，关注从需求讨论到上线维护的完整过程。在实践中尝试兼顾使用体验、系统稳定性和后续维护，让技术真正服务于内容与使用者。'
  },
  {
    id:'qu-yichen',name:'瞿伊辰',role:'人事总监',example:true,
    motto:'让合适的人，在一起成为更好的团队。',
    experience:'曾参与团队招募、成员沟通与协作安排，尝试理解每个人的兴趣、优势和期待。通过交流与反馈梳理分工，关注新成员如何融入，以及团队如何在合作中建立信任。'
  },
  {
    id:'xu-xiang',name:'徐想',role:'行政总管',example:true,
    motto:'把细节安顿好，让大家安心向前。',
    experience:'曾参与活动物料、日程安排与日常事务协调，在准备和执行中积累了清单管理与信息整理的经验。关注容易被忽略的小环节，希望让协作中的每一步都更加清楚、有序。'
  },
  {
    id:'gao-tianyi',name:'高天一',role:'艺术总监',example:true,
    motto:'让表达有自己的样子，也有被理解的可能。',
    experience:'曾参与海报、版式与视觉概念的探索，从文字和内容出发寻找合适的视觉语言。在不同形式的设计练习中，逐步建立对色彩、节奏与留白的理解，也重视作品与读者之间的联系。'
  },
  {
    id:'wu-yunhe',name:'吴允赫',role:'产品经理',example:true,
    motto:'从一个真实的问题开始，做一点有用的改变。',
    experience:'曾参与需求整理、功能构思与原型讨论，通过观察和反馈理解使用过程中的困惑。习惯先把问题说清楚，再与不同分工一起确定优先级，并在迭代中检查设计是否真正解决了问题。'
  }
].map(member=>Object.freeze(member)));
if(typeof module!=='undefined'&&module.exports)module.exports=MoyuTeam;
if(typeof window!=='undefined')window.MoyuTeam=MoyuTeam;
