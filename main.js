const searchButton = document.getElementById("searchButton");
const playerNameInput = document.getElementById("playerNameInput");
const results = document.getElementById("results");
const loading = document.getElementById("loading");
const error = document.getElementById("error");

searchButton.onclick = function () {
    const name = playerNameInput.value;

    if (name === "") {
        error.textContent = "Введите имя игрока";
        return;
    }

    error.textContent = "";
    results.innerHTML = "";
    loading.style.display = "block";

    const url = "https://api.opendota.com/api/search?q=" + name + "&limit=10";

    fetch(url)
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            loading.style.display = "none";

            if (data.length === 0) {
                results.innerHTML = "<p>Ничего не найдено</p>";
                return;
            }

            for (let i = 0; i < data.length; i++) {
                const player = data[i];

                const card = document.createElement("div");
                card.className = "player";

                const img = document.createElement("img");
                img.src = player.avatarfull;
                img.onerror = function () {
                    this.src = "https://via.placeholder.com/50";
                };

                const info = document.createElement("div");

                const nick = document.createElement("h3");
                nick.textContent = player.personaname || "Скрытый игрок";

                const id = document.createElement("p");
                id.textContent = "ID: " + player.account_id;

                info.appendChild(nick);
                info.appendChild(id);

                card.appendChild(img);
                card.appendChild(info);
                results.appendChild(card);
            }
        })
        .catch(function (err) {
            loading.style.display = "none";
            error.textContent = "Ошибка при поиске. Попробуйте позже.";
            console.log(err);
        });
};