(function(){
  'use strict';
  const ids=new URLSearchParams(location.search).getAll('id');
  const member=ids.length===1?window.MoyuTeam.find(person=>person.id===ids[0]):null;
  if(!member){
    document.querySelector('#member-error').hidden=false;
    document.title='成员不存在 — 墨愚';
    return;
  }
  document.title=`${member.name} — 墨愚`;
  document.querySelector('#profile-name').textContent=member.name;
  document.querySelector('#profile-role').textContent=member.role;
  document.querySelector('#profile-motto').textContent=member.motto;
  document.querySelector('#profile-experience').textContent=member.experience;
  document.querySelector('#profile-example').hidden=!member.example;
  document.querySelector('#member-return').href=`team.html#member-${member.id}`;
  const portrait=member.portrait||'assets/team/avatar-placeholder.svg';
  document.querySelector('#profile-image').src=portrait;
  document.querySelector('#profile-mobile-image').srcset=member.mobilePortrait||portrait;
  if(member.backdrop){
    const backdrop=document.querySelector('#profile-backdrop');
    backdrop.src=member.backdrop;
    backdrop.hidden=false;
  }
  document.querySelector('#member-profile').classList.toggle('has-portrait',Boolean(member.portrait));
  document.querySelector('#member-profile').classList.toggle('has-cropped-portrait',Boolean(member.croppedPortrait));
  document.querySelector('#member-profile').setAttribute('aria-labelledby','profile-name');
  document.querySelector('#member-profile').hidden=false;
})();
