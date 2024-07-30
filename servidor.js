var express = require('express'); // requisita a biblioteca para a criacao dos serviços web.
var pg = require("pg"); // requisita a biblioteca pg para a comunicacao com o banco de dados.

var sw = express(); // iniciliaza uma variavel chamada app que possitilitará a criação dos serviços e rotas.

sw.use(express.json());//padrao de mensagens em json.
//permitir o recebimento de qualquer origem, aceitar informações no cabeçalho e permitir o métodos get e post
sw.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET,POST');
    next();
});


const config = {
    host: 'localhost',
    user: 'postgres',
    database: 'db_cs_2024',
    password: 'postgres',
    port: 5432
};

//definia conexao com o banco de dados.
const postgres = new pg.Pool(config);

//definicao do primeiro serviço web.
sw.get('/', (req, res) => {
    res.send('Hello, world! meu primeiro teste.  #####');
})


sw.listen(4000, function () {
    console.log('Server is running.. on Port 4000');
});