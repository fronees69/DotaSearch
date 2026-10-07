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

    fetch("https://api.opendota.com/api/players/" + playerId)
        .then(function (response) {
            return response.json()
        })
        .then(function (profile) {
            return fetch("https://api.opendota.com/api/players/" + playerId + "/recentMatches")
                .then(function (response) {
                    return response.json()
                })
                .then(function (matches) {
                    showPlayerInfo(profile, matches)
                })
        })
        .catch(function (err) {
            console.log(err)
            modalContent.replaceChildren()
            const errText = document.createElement("p")
            errText.textContent = "Не удалось загрузить данные игрока"
            modalContent.appendChild(errText)
        })
}

function showPlayerInfo(profile, matches) {
    let nick = "Игрок"
    if (profile.profile && profile.profile.personaname) {
        nick = profile.profile.personaname
    }

    modalContent.replaceChildren()

    const title = document.createElement("h2")
    title.textContent = nick
    modalContent.appendChild(title)

    const rankBox = document.createElement("div")
    rankBox.className = "rank-info"

    const rankTier = profile.rank_tier

    if (rankTier) {
        const rankNumber = Math.floor(rankTier / 10)
        const stars = rankTier % 10
        const rankName = rankNames[rankNumber] || "Неизвестный ранг"

        const iconUrl = "https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_" + rankTier + ".png"

        const rankImg = document.createElement("img")
        rankImg.src = iconUrl
        rankImg.alt = "Ранг"
        rankImg.onerror = function () {
            this.style.display = "none"
        };
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
