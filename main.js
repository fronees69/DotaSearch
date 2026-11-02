const searchButton = document.getElementById("searchButton");
const playerNameInput = document.getElementById("playerNameInput");
const results = document.getElementById("results");
const loading = document.getElementById("loading");
const error = document.getElementById("error");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const modalClose = document.getElementById("modalClose");

const rankNames = [
    "Нет ранга",
    "Herald",
    "Guardian",
    "Crusader",
    "Archon",
    "Legend",
    "Ancient",
    "Divine",
    "Immortal"
];

const heroes = {};

fetch("https://api.opendota.com/api/heroes")
    .then(function (response) {
        return response.json()
    })
    .then(function (data) {
        for (const hero of data) {
            heroes[hero.id] = hero.localized_name
        }
    })
    .catch(function (err) {
        console.log("Не удалось загрузить героев", err)
    })

searchButton.onclick = function () {
    const name = playerNameInput.value.trim()

    if (name === "") {
        error.textContent = "Введите имя игрока"
        return
    }

    error.textContent = ""
    results.replaceChildren()
    loading.style.display = "block"
    searchButton.disabled = true

    const url = "https://api.opendota.com/api/search?q=" + encodeURIComponent(name) + "&limit=10"

    fetch(url)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Ошибка сервера");
            }
            return response.json()
        })
        .then(function (data) {
            loading.style.display = "none"
            searchButton.disabled = false

            if (!Array.isArray(data)) {
                error.textContent = "Ошибка"
                return
            }

            if (data.length === 0) {
                const empty = document.createElement("p")
                empty.textContent = "Ничего не найдено"
                results.appendChild(empty)
                return
            }

            for (let i = 0; i < data.length; i++) {
                const player = data[i]

                const card = document.createElement("div")
                card.className = "player"
                card.style.cursor = "pointer"

                const playerId = player.account_id

                card.onclick = function () {
                    openModal(playerId)
                }

                const img = document.createElement("img")
                img.src = player.avatarfull
                img.onerror = function () {
                    this.src = "https://via.placeholder.com/50"
                }

                const info = document.createElement("div")

                const nick = document.createElement("h3")
                nick.textContent = player.personaname || "Скрытый игрок"

                const id = document.createElement("p")
                id.textContent = "ID: " + player.account_id

                info.appendChild(nick)
                info.appendChild(id)
                card.appendChild(img)
                card.appendChild(info)
                results.appendChild(card)
            }
        })
        .catch(function (err) {
            loading.style.display = "none"
            searchButton.disabled = false
            error.textContent = "Ошибка при поиске"
            console.log(err)
        })
}

playerNameInput.onkeydown = function (event) {
    if (event.key === "Enter") {
        searchButton.click()
    }
};

function openModal(playerId) {
    modal.style.display = "flex"

    modalContent.replaceChildren()
    const loadingText = document.createElement("p")
    loadingText.textContent = "Загрузка..."
    modalContent.appendChild(loadingText)

    Promise.all([
        fetch("https://api.opendota.com/api/players/" + playerId).then(function (r) {
            return r.json()
        }),
        fetch("https://api.opendota.com/api/players/" + playerId + "/recentMatches").then(function (r) {
            return r.json()
        }),
        fetch("https://api.opendota.com/api/players/" + playerId + "/wl").then(function (r) {
            return r.json()
        })
    ])
        .then(function (responses) {
            const profile = responses[0]
            const matches = responses[1]
            const wl = responses[2]
            showPlayerInfo(profile, matches, wl)
        })
        .catch(function (err) {
            console.log(err)
            modalContent.replaceChildren()
            const errText = document.createElement("p")
            errText.textContent = "Не удалось загрузить данные игрока"
            modalContent.appendChild(errText)
        })
}

function showPlayerInfo(profile, matches, wl) {
    let nick = "Игрок"
    if (profile.profile && profile.profile.personaname) {
        nick = profile.profile.personaname
    }

    modalContent.replaceChildren()

    const title = document.createElement("h2")
    title.textContent = nick
    modalContent.appendChild(title)

    if (wl && (wl.win > 0 || wl.lose > 0)) {
        const wins = wl.win || 0
        const loses = wl.lose || 0
        const total = wins + loses
        const winRate = total > 0 ? (wins / total) * 100 : 0
        const isBad = winRate < 50
        const color = isBad ? "#f44336" : "#4caf50"

        const winrateBox = document.createElement("div")
        winrateBox.className = "winrate-info"

        const line = document.createElement("div")
        line.className = "winrate-line"

        const label = document.createTextNode("Процент побед: ")
        const value = document.createElement("strong")
        value.style.color = color
        value.textContent = winRate.toFixed(2) + "%"

        line.appendChild(label)
        line.appendChild(value)

        const sub = document.createElement("div")
        sub.className = "winrate-sub"
        sub.textContent = "Побед: " + wins + " • Поражений: " + loses + " • Всего: " + total

        winrateBox.appendChild(line)
        winrateBox.appendChild(sub)
        modalContent.appendChild(winrateBox)
    }

    const rankBox = document.createElement("div")
    rankBox.className = "rank-info"

    const rankTier = profile.rank_tier

    if (rankTier) {
        const rankNumber = Math.floor(rankTier / 10)
        const stars = rankTier % 10
        const rankName = rankNames[rankNumber] || "Неизвестный ранг"

        const iconUrl = rankName + ".png"

        const rankImg = document.createElement("img")
        rankImg.src = iconUrl
        rankImg.alt = "Ранг"
        rankImg.onerror = function () {
            this.style.display = "none"
        }
        rankBox.appendChild(rankImg)

        const rankTextWrap = document.createElement("div")
        const rankLabel = document.createElement("strong")
        rankLabel.textContent = "Ранг: "
        rankTextWrap.appendChild(rankLabel)
        rankTextWrap.appendChild(
            document.createTextNode(rankName + " (" + stars + "★)")
        )
        rankBox.appendChild(rankTextWrap)
    } else {
        const noRank = document.createElement("div")
        noRank.textContent = "Ранг: не откалиброван"
        rankBox.appendChild(noRank)
    }

    modalContent.appendChild(rankBox)

    const matchesTitle = document.createElement("h3")
    matchesTitle.textContent = "Последние матчи"
    modalContent.appendChild(matchesTitle)

    const matchList = document.createElement("div")
    matchList.className = "match-list"

    if (matches && matches.length > 0) {
        const lastMatches = matches.slice(0, 10)

        for (let i = 0; i < lastMatches.length; i++) {
            const match = lastMatches[i]

            let heroName = heroes[match.hero_id]
            if (!heroName) {
                heroName = "Герой #" + match.hero_id
            }

            let win = false
            if (match.player_slot < 128) {
                win = match.radiant_win
            } else {
                win = !match.radiant_win
            }

            let resultClass = "loss"
            let resultText = "Поражение"
            if (win) {
                resultClass = "win"
                resultText = "Победа"
            }

            const item = document.createElement("div")
            item.className = "match-item " + resultClass

            const heroSpan = document.createElement("span")
            heroSpan.className = "hero-name"
            heroSpan.textContent = heroName

            const kdaSpan = document.createElement("span")
            kdaSpan.className = "kda"
            kdaSpan.textContent = match.kills + "/" + match.deaths + "/" + match.assists

            const resultSpan = document.createElement("span")
            resultSpan.className = "result " + resultClass
            resultSpan.textContent = resultText

            item.appendChild(heroSpan)
            item.appendChild(kdaSpan)
            item.appendChild(resultSpan)
            matchList.appendChild(item)
        }
    } else {
        const noMatches = document.createElement("p")
        noMatches.textContent = "Матчей не найдено"
        matchList.appendChild(noMatches)
    }

    modalContent.appendChild(matchList)
}

modalClose.onclick = function () {
    modal.style.display = "none"
    modalContent.replaceChildren()
}

modal.onclick = function (event) {
    if (event.target === modal) {
        modal.style.display = "none"
        modalContent.replaceChildren()
    }
}

document.onkeydown = function (event) {
    if (event.key === "Escape" && modal.style.display === "flex") {
        modal.style.display = "none"
        modalContent.replaceChildren()
    }
}

const singInButton = document.createElement('button')
singInButton.classList.add('singInButton')
document.body.append(singInButton)
singInButton.textContent = "Sing in"

const logInButton = document.createElement('button')
logInButton.classList.add('logInButton')
document.body.append(logInButton)
logInButton.textContent = "Log in"

const signInModal = document.createElement("div")
signInModal.className = "modal-overlay"
signInModal.id = "signInModal"
signInModal.style.display = "none"

const signInWindow = document.createElement("div")
signInWindow.className = "modal-window auth-window"

const signInText1 = document.createElement("p")
signInText1.textContent = "Введите ник"
signInText1.classList.add("singInText")

const singInName = document.createElement("input")
singInName.classList.add("singInInput")

const signInText2 = document.createElement("p")
signInText2.textContent = "Введите пароль"
signInText2.classList.add("singInText")

const signInPassword = document.createElement("input")
signInPassword.classList.add("singInInput")

const signInClose = document.createElement("span")
signInClose.className = "modal-close"
signInClose.textContent = "×"
signInClose.id = "signInClose"

const signInTitle = document.createElement("h2")
signInTitle.textContent = "Регистрация"

signInWindow.appendChild(signInClose)
signInWindow.appendChild(signInTitle)
signInWindow.appendChild(signInText1)
signInWindow.appendChild(singInName)
signInWindow.appendChild(signInText2)
signInWindow.appendChild(signInPassword)
signInModal.appendChild(signInWindow)
document.body.appendChild(signInModal)

signInClose.onclick = function () {
    signInModal.style.display = "none"
}

signInModal.onclick = function (event) {
    if (event.target === signInModal) {
        signInModal.style.display = "none"
    }
}

const logInModal = document.createElement("div")
logInModal.className = "modal-overlay"
logInModal.id = "logInModal"
logInModal.style.display = "none"

const logInWindow = document.createElement("div")
logInWindow.className = "modal-window auth-window"

const logInClose = document.createElement("span")
logInClose.className = "modal-close"
logInClose.textContent = "×"
logInClose.id = "logInClose"

const logInTitle = document.createElement("h2")
logInTitle.textContent = "Вход"

logInWindow.appendChild(logInClose)
logInWindow.appendChild(logInTitle)
logInModal.appendChild(logInWindow)
document.body.appendChild(logInModal)

logInClose.onclick = function () {
    logInModal.style.display = "none"
}

logInModal.onclick = function (event) {
    if (event.target === logInModal) {
        logInModal.style.display = "none"
    }
}

singInButton.onclick = function () {
    signInModal.style.display = "flex"
}

logInButton.onclick = function () {
    logInModal.style.display = "flex"
}

