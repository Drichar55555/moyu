/* Data and pure scoring functions. All seed records are explicitly fictional. */
(function (root) {
  'use strict';
  const jobs = [
    {id:'cashier', name:'收银员', note:'结算与门店服务'},
    {id:'translator', name:'翻译', note:'语言转换与语境理解'},
    {id:'driver', name:'司机', note:'驾驶与现场判断'},
    {id:'accountant', name:'会计', note:'账务与财务判断'},
    {id:'developer', name:'程序员', note:'软件开发与问题求解'},
    {id:'designer', name:'设计师', note:'视觉表达与创意判断'},
    {id:'teacher', name:'教师', note:'知识传授与学习陪伴'},
    {id:'nurse', name:'护理人员', note:'临床照护与情感支持'}
  ];
  const ids = jobs.map(job => job.id);
  const seedOrders = [
    [0,1,3,2,4,5,6,7], [1,0,4,3,5,2,6,7], [2,0,1,3,5,4,7,6],
    [3,1,0,4,2,5,6,7], [0,2,3,1,4,5,7,6], [1,4,5,0,3,2,6,7]
  ].map((order, index) => ({name:`模拟参与者 ${String(index + 1).padStart(2, '0')}`, order:order.map(i => ids[i])}));
  const cohorts = [
    {id:'young', label:'10后、20后', years:'2010 年及以后出生'},
    {id:'middle', label:'90后、00后', years:'1990—2009 年出生'},
    {id:'older', label:'80后及以前', years:'1989 年及以前出生'}
  ];
  // Counts illustrate mechanics, not real views of any generation. Each row has 40 fictional votes.
  const questions = [
    {id:'weekend', topic:'日常与闲暇', title:'突然多出一天完全自由的时间，你最想怎么过？', options:['去没去过的地方走走','和家人朋友待在一起','一个人安静地做喜欢的事','学一个一直想学的新东西'], seed:{young:[17,7,10,6],middle:[8,9,18,5],older:[7,21,6,6]}},
    {id:'work', topic:'选择与生活', title:'如果选择一份工作，哪一点对你最重要？', options:['收入和稳定感','有趣，能做自己喜欢的事','有成长空间，能不断学习','有时间照顾自己的生活'], seed:{young:[8,17,9,6],middle:[12,6,7,15],older:[23,4,6,7]}},
    {id:'friendship', topic:'关系与表达', title:'朋友心情不太好，你会先怎么做？', options:['先安静听对方说','一起出门，换个心情','帮忙分析，再给些建议','发点有趣的东西，缓和气氛'], seed:{young:[10,9,6,15],middle:[19,9,8,4],older:[9,6,21,4]}},
    {id:'future', topic:'变化与未来', title:'面对一项陌生的新技术，你通常会怎么做？', options:['马上试试，边用边学','先看看别人怎么用','了解风险和规则后再决定','等到真正需要时再接触'], seed:{young:[22,8,6,4],middle:[12,8,15,5],older:[5,16,10,9]}}
  ];
  function validOrder(order) { return Array.isArray(order) && order.length === ids.length && new Set(order).size === ids.length && order.every(id => ids.includes(id)); }
  // Never reorder this v1 dictionary: old links must keep the same meaning.
  const shareIdsV1 = ['cashier','translator','driver','accountant','developer','designer','teacher','nurse'];
  function encodeResult(order) {
    if (!validOrder(order)) throw new Error('Invalid result order');
    return 'v1.' + order.map(id => shareIdsV1.indexOf(id)).join('');
  }
  function decodeResult(token) {
    if (typeof token !== 'string' || !/^v1\.[0-7]{8}$/.test(token)) return null;
    const order = token.slice(3).split('').map(n => shareIdsV1[Number(n)]);
    return validOrder(order) ? order : null;
  }
  function moveJob(order, from, to) {
    if (!validOrder(order) || !Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= order.length || to >= order.length) return [...order];
    const next = [...order]; next.splice(to, 0, next.splice(from, 1)[0]); return next;
  }
  function rankJobs(orders) {
    const valid = orders.filter(validOrder);
    if (!valid.length) return [];
    const rows = jobs.map(job => ({...job, sum:valid.reduce((sum, order) => sum + order.indexOf(job.id) + 1, 0), first:valid.filter(order => order[0] === job.id).length, total:valid.length}));
    rows.sort((a,b) => a.sum - b.sum || ids.indexOf(a.id) - ids.indexOf(b.id));
    return rows.map((row, i) => ({...row, average:row.sum / valid.length, rank:rows.findIndex(other => other.sum === row.sum) + 1, tied:rows.some((other,j) => i !== j && other.sum === row.sum)}));
  }
  function validResponse(record) {
    return Boolean(record && cohorts.some(c => c.id === record.cohort) && record.answers && questions.every(q => Number.isInteger(record.answers[q.id]) && record.answers[q.id] >= 0 && record.answers[q.id] < q.options.length));
  }
  function tally(question, cohort, record) {
    const counts = [...(question.seed[cohort] || question.options.map(() => 0))];
    if (validResponse(record) && record.cohort === cohort) counts[record.answers[question.id]] += 1;
    return counts;
  }
  function modes(counts) {
    const max = Math.max(0, ...counts);
    return max === 0 ? [] : counts.flatMap((count, i) => count === max ? [i] : []);
  }
  function grade(counts, answer) {
    const winners = modes(counts);
    return winners.length ? winners.includes(answer) : null;
  }
  const api = {jobs, seedOrders, cohorts, questions, validOrder, encodeResult, decodeResult, moveJob, rankJobs, validResponse, tally, modes, grade};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MoyuActivities = api;
})(globalThis);