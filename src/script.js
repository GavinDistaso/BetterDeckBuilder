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

function colorIdentityListToHTML(list){
    let elements = [];

    list.forEach(element => {
        elements.push(`<div color-type='${element.toUpperCase()}'></div>`)
    });

    return elements.join('');
}

//

const loginLink = document.getElementById('loginButton');

document.addEventListener('DOMContentLoaded', async function() {
    if(!window.user){
        await attemptGetUser();
    }

    if(window.user){
        loginButton.innerText = 'Logged in as "' + window.user.userName + '"';
    }
});
