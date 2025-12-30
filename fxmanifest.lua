fx_version 'cerulean'
game 'gta5'

author 'Roo'
description 'Silent Operator - Advanced Hacker Script'
version '1.0.0'

ui_page 'html/index.html'

client_scripts {
    'client/main.lua'
}

server_scripts {
    'server/main.lua'
}

files {
    'html/index.html',
    'html/style.css',
    'html/script.js',
    'html/assets/*.png', -- Gerekirse ikonlar için
    'html/assets/*.svg'
}
