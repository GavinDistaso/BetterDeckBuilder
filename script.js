document.querySelector('html').style.setProperty(
    '--background-angle',
    parseInt(Math.random() * 360) + 'deg'
);

window.addEventListener('click', (event)=>{
    [...document.querySelectorAll('.dropdown')].forEach(e=>{
        e.setAttribute('selected', 'false');
    });

    let targetParent = event.target.parentElement;
    if(targetParent.classList.contains('dropdown')){
        let attr = targetParent.getAttribute('selected') == 'true';
        targetParent.setAttribute('selected', `${!attr}`);
    }

    //
    
    if(targetParent.id == 'warnings'){
        targetParent.removeChild(event.target);
    }
})
