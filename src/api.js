const API = window.location.origin != 'https://betterdeckbuilder.gavindistaso.com' ? 'http://127.0.0.1:8443' : ('https://bdbapi.gavindistaso.com:8443');

window.user = null;

function setCookie(name, value, exiration) {
    var expires = "";

    var date = new Date();
    date.setTime(exiration);
    expires = "; expires=" + date.toUTCString();
    
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];

        while(c.charAt(0) == ' ') {
            c = c.substring(1,c.length);
        }

        if(c.indexOf(nameEQ) == 0){
            return c.substring(nameEQ.length,c.length);
        }
    }
    return null;
}


// This sets window.user to basic user info, else window.user will be null
async function attemptGetUser(){
    let bearerToken = getCookie("Bearer");

    if(!bearerToken){ window.user = null; return null; }

    let result = await (await fetch(`${API}/userInfo`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${bearerToken}`,
        }
    })).json()

    if(!result.success){ window.user = null; return null; }

    window.user = result.payload;

    window.user.bearer = bearerToken;

    return window.user;
}

async function makeApiRequest(endpoint, method = 'GET', body = null){
    if(!window.user && !(await attemptGetUser())){
        return [false, "User not logged in.", {}];
    }

    let result = await (await fetch(`${API}/${endpoint}`, {
        method: method,
        headers: {
            'Authorization': `Bearer ${window.user.bearer}`,
        },
        body: body
    })).json()

    return [result.success, result.errMessage, result.payload];
}
