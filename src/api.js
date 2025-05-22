const API = window.location.origin != 'https://betterdeckbuilder.gavindistaso.com' ? 'http://127.0.0.1:8443' : ('https://bdbapi.gavindistaso.com:8443');

window.user = null;


// This sets window.user to basic user info, else window.user will be null
async function attemptGetUser(){
    let bearerToken = (await cookieStore.get('Bearer'));

    if(!bearerToken || !bearerToken.value){ window.user = null; return null; }

    bearerToken = bearerToken.value;

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
        return [false, {}, "User not logged in."];
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
