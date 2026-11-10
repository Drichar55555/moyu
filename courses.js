(function(){
  'use strict';
  const courses=window.MoyuCourses;
  const currency=new Intl.NumberFormat('zh-CN',{style:'currency',currency:'CNY'});
  const price=course=>currency.format(course.priceCents/100);
  const format=course=>course.delivery
    ?`${course.delivery.lessonCount} 节 · 每节 ${course.delivery.minutesPerLesson} 分钟 · ${course.delivery.mode}`
    :`${course.lessons.length} 节录播 · 约 ${course.lessons.reduce((sum,lesson)=>sum+lesson.minutes,0)} 分钟`;
  const courseURL=(page,course)=>`${page}?id=${encodeURIComponent(course.id)}`;
  function node(tag,className,text){
    const element=document.createElement(tag);
    if(className)element.className=className;
    if(text!==undefined)element.textContent=text;
    return element;
  }
  function cover(course,lazy=false){
    const image=node('img');
    image.src=course.image;
    image.alt=`${course.title}课程封面`;
    image.width=640;
    image.height=480;
    image.loading=lazy?'lazy':'eager';
    return image;
  }
  const grid=document.querySelector('#course-grid');
  if(grid){
    const search=document.querySelector('#course-search');
    const filters=document.querySelector('#course-filters');
    const count=document.querySelector('#course-count');
    const empty=document.querySelector('#course-empty');
    let category='全部';
    const cards=courses.map(course=>{
      const card=node('a','course-card');
      card.href=courseURL('course.html',course);
      card.dataset.courseId=course.id;
      const imageBox=node('div','course-card-image');
      imageBox.append(cover(course,true));
      const copy=node('div','course-card-copy');
      const title=node('h3','course-card-title',course.title);
      title.id=`course-card-${course.id}`;
      card.setAttribute('aria-labelledby',title.id);
      const footer=node('div','course-card-footer');
      const amount=node('p','course-card-price',price(course));
      footer.append(amount);
      copy.append(title,node('p','course-card-subtitle',course.subtitle),footer);
      card.append(imageBox,copy);
      return card;
    });
    grid.replaceChildren(...cards);
    function filterCourses(){
      const term=search.value.trim().toLocaleLowerCase('zh-CN');
      let total=0;
      courses.forEach((course,index)=>{
        const matches=(category==='全部'||course.category===category)&&`${course.title} ${course.subtitle} ${course.category}`.toLocaleLowerCase('zh-CN').includes(term);
        cards[index].hidden=!matches;
        if(matches)total++;
      });
      count.textContent=`${total} 门课程`;
      empty.hidden=total>0;
      filters.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.textContent===category)));
    }
    ['全部',...new Set(courses.map(course=>course.category))].forEach(label=>{
      const button=node('button','',label);
      button.type='button';
      button.addEventListener('click',()=>{category=label;filterCourses();});
      filters.append(button);
    });
    search.addEventListener('input',filterCourses);
    document.querySelector('#clear-course-filters').addEventListener('click',()=>{
      category='全部';
      search.value='';
      filterCourses();
      search.focus();
    });
    filterCourses();
    return;
  }

  const ids=new URLSearchParams(location.search).getAll('id');
  const course=ids.length===0?courses[0]:ids.length===1?courses.find(item=>item.id===ids[0]):null;
  if(!course){
    document.querySelector('#course-error').hidden=false;
    document.title='课程不存在 — 墨愚';
    return;
  }
  document.querySelectorAll('[data-course-title]').forEach(element=>{element.textContent=course.title;});
  document.querySelectorAll('[data-course-subtitle]').forEach(element=>{element.textContent=course.subtitle;});
  document.querySelectorAll('[data-course-description]').forEach(element=>{element.textContent=course.description;});
  document.querySelectorAll('[data-course-price]').forEach(element=>{element.textContent=price(course);});
  document.querySelectorAll('[data-course-format]').forEach(element=>{element.textContent=format(course);});
  document.querySelectorAll('[data-course-checkout]').forEach(link=>{link.href=courseURL('checkout.html',course);});
  document.querySelectorAll('[data-course-detail]').forEach(link=>{link.href=courseURL('course.html',course);});
  document.querySelectorAll('[data-course-image]').forEach(image=>{
    image.src=course.image;
    image.alt=`${course.title}课程封面`;
  });
  document.querySelector('[data-course-surface]').hidden=false;
  const lessons=document.querySelector('.course-lessons');
  if(lessons){
    document.title=`${course.title} — 墨愚课程`;
    if(course.teacher){
      document.querySelector('#teaching').hidden=false;
      document.querySelector('[href="#teaching"]').hidden=false;
      const facts=document.querySelector('#course-facts');
      [{label:'领读老师',value:course.teacher.name},...course.arrangements].forEach(fact=>{
        const row=node('div');
        row.append(node('dt','',fact.label),node('dd','',fact.value));
        facts.append(row);
      });
      document.querySelector('#teacher-bio').textContent=course.teacher.bio;
    }
    const outcomes=document.querySelector('.course-outcomes');
    course.outcomes.forEach(outcome=>{
      const article=node('article');
      article.append(node('h3','',outcome.title),node('p','',outcome.text));
      outcomes.append(article);
    });
    if(course.outline){
      document.querySelector('#syllabus-title').textContent='课程内容';
      document.querySelector('[data-course-syllabus-label]').textContent='课程内容';
      document.querySelector('[data-course-syllabus-action]').textContent='查看内容';
    }
    (course.outline||course.lessons).forEach((lesson,index)=>{
      const details=node('details');
      details.open=index===0;
      const summary=node('summary');
      if(course.outline){
        summary.textContent=lesson.title;
      }else{
        summary.append(node('span','',String(index+1).padStart(2,'0')),document.createTextNode(lesson.title),node('small','',`${lesson.minutes} 分钟`));
      }
      details.append(summary,node('p','',lesson.text));
      lessons.append(details);
    });
    document.querySelector('#course-audience').append(...course.audience.map(text=>node('li','',text)));
    return;
  }

  window.MoyuCheckout.start(course);
})();
