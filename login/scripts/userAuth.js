const loginButton = document.getElementById('loginButton');
const signupButton = document.getElementById('signupButton');

const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');

const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupUsername = document.getElementById('signupUserName');

//

loginButton.addEventListener('click', async ()=>{
    let result = await (await fetch(`${API}/auth`, {
        method: 'GET',
        headers: {
            'credentials-email': loginEmail.value,
            'credentials-password': loginPassword.value,
        }
    })).json()

    if(result.success){
        setCookie('Bearer', result.payload.bearerToken, result.payload.expiresAt);
        window.location.replace('./..');
    } else {
        alert(`Login failed : ${result.errMessage}`);
    }
})

signupButton.addEventListener('click', async ()=>{
    let result = await (await fetch(`${API}/signup`, {
        method: 'GET',
        headers: {
            'credentials-email': signupEmail.value,
            'credentials-password': signupPassword.value,
            'credentials-username': signupUsername.value,
        }
    })).json()

    if(result.success){
        alert(`User created!`);

        let result = await (await fetch(`${API}/auth`, {
            method: 'GET',
            headers: {
                'credentials-email': signupEmail.value,
                'credentials-password': signupPassword.value,
            }
        })).json()

        setCookie('Bearer', result.payload.bearerToken, result.payload.expiresAt);

        window.location.replace('./..');
    } else {
        alert(`Signup failed : ${result.errMessage}`);
    }
})
