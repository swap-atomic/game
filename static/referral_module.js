
function setupCopyButtons() {
    let buttons = document.querySelectorAll("button.copy");
    [...buttons].map( b => {
        let copyId = b.getAttribute('data-copy-el');
        let elToCopy = document.querySelector("#" + copyId);
        b.addEventListener("click", () => {
            elToCopy.select();
            document.execCommand("copy");
        });
    });
}

function hideNotReady() {
    let termsLink = document.querySelectorAll("#header h2")[1];
    let tranButton = document.querySelector("#transaction-btn");
    [termsLink, tranButton].map(e => e.remove());
}

//Set up Light Box function
function setupLBFunction(option){
    return () => {
        let template = document.querySelector(option.tag);
        let c = document.importNode(template.content, true);
        addLightBox(c);
        if(option.onOpen) option.args ? option.onOpen(option.args) : option.onOpen();
    }
}

function setIframeValue(languages) {
    for (let lang of languages) {
        let tag = "#iframe_" + (lang != 'en' ? (lang + "_") : '') + "embed";
        let val = decodeURIComponent($(tag)[0].value);
        if(lang !== 'en') {
            val = val.replace(/\?game/g, '?lang=' + lang + '&game');
        }
        $(tag)[0].value = val;
    }
}

function setModalButtons(options) {
    for(option of options) {
        let fn = setupLBFunction(option)
        document.querySelector(option.button).addEventListener("click", fn);
    }
}

function linkIframeSizeChanger(lang='en') {
    //Size Changer Code
    let input = document.querySelector("input.iframe-height");
    let iframeContainer = document.querySelector("#games-iframe-container");
    //Change to 400 by default if mobile
    if(isMobile.any()){
        let mVal;
        if(window.matchMedia('(orientation: portrait)').matches) {
            mVal = 400;
        }else {
            mVal = 300;
        }
        input.value = mVal;
        iframeContainer.style.transform = "scale(" + mVal / 600.0 +")";
    }
    input.addEventListener("keyup", () => {
        let fVal = parseFloat(input.value)
        if(fVal <= 600.0) {
            iframeContainer.style.transform = "scale(" + fVal / 600.0 +")";
        }else {
            iframeContainer.style.transform = "scale(1)";
        }
    });
    //Copy custom size code
    let copyTag = "#copy-" + (lang != 'en' ? (lang + '-') : '') + "custom";
    let copyButton = document.querySelector(copyTag);
    copyOnClick(copyButton, () => iframeContainer.outerHTML.replace(/&amp;/g, '&'));
}

function addLangTag(lang) {
    let temp = document.querySelector("template.iframe-preview-template." + lang).content.querySelector(".iframe-preview");
    temp.innerHTML = temp.innerHTML.replace(/\?game/g, '?lang=' + lang + '&game')
}

document.addEventListener("DOMContentLoaded", (event) => {
    setupCopyButtons();
    hideNotReady();
    setIframeValue(['en', 'ru']);
    addLangTag("ru");

    //showWelcomeList
    setupLBFunction({tag: "template#welcome-list-template"})();

    options = [{
        "tag": "template#payout-table-template",
        "button": "#payout-btn"
    },
        {
            "tag": "template.iframe-preview-template.en",
            "button": "#iframe-btn",
            "onOpen": linkIframeSizeChanger
        },{
            "tag": "template.iframe-preview-template.ru",
            "button": "#iframe-ru-btn",
            "onOpen": linkIframeSizeChanger,
            "args": 'ru'
        }];
    setModalButtons(options)

});
