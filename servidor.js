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

sw.get('/listenderecos', function (req, res, next) {

    postgres.connect(function (err, client, done) {

        if (err) {

            console.log("Nao conseguiu acessar o  BD " + err);
            res.status(400).send('{' + err + '}');
        } else {

            var q = 'select * from tb_endereco order by codigo asc';

            client.query(q, function (err, result) {
                done(); // closing the connection;
                if (err) {
                    console.log('retornou 400 no listendereco');
                    console.log(err);

                    res.status(400).send('{' + err + '}');
                } else {

                    //console.log('retornou 201 no /listendereco');
                    res.status(201).send(result.rows);
                }
            });
        }
    });
});
sw.get('/listpatentes', function (req, res, next) {

    postgres.connect(function (err, client, done) {

        if (err) {

            console.log("Nao conseguiu acessar o  BD " + err);
            res.status(400).send('{' + err + '}');
        } else {

            var q = 'select codigo as id, nome, quant_min_pontos, to_char(datacriacao, \'dd/mm/yyyy hh24:mm:ss\') as DataCriacao, cor, logotipo from tb_patente order by codigo asc';

            client.query(q, function (err, result) {
                done(); // closing the connection;
                if (err) {
                    console.log('retornou 400 no listpatentes');
                    console.log(err);

                    res.status(400).send('{' + err + '}');
                } else {

                    //console.log('retornou 201 no /listendereco');
                    res.status(201).send(result.rows);
                }
            });
        }
    });
});

sw.get('/listjogadores', function (req, res, next) {

    postgres.connect(function (err, client, done) {

        if (err) {

            console.log("Nao conseguiu acessar o  BD " + err);
            res.status(400).send('{' + err + '}');
        } else {

            var q = 'select nickname, senha, 0 as patentes, quantpontos, quantdinheiro, to_char(datacadastro, \'dd/mm/yyyy hh24:mm:ss\') as DataCadastro, to_char(data_ultimo_login, \'dd/mm/yyyy hh24:mm:ss\') as Data_ultimo_login, situacao, 0 as endereco from tb_jogador order by nickname asc';
                //incluir todas as colunas de tb_endereco
            client.query(q, async function (err, result) {
                
                if (err) {
                    console.log('retornou 400 no listjogadores');
                    console.log(err);         
                    res.status(400).send('{' + err + '}');
                } else {
                    for(var i=0; i < result.rows.length; i++){
                        try{//incluir todas as colunas de tb_patente
                            pj = await client.query('select codpatente from '+
                            'tb_jogador_conquista_patente '+
                            'where nickname = $1', [result.rows[i].nickname])
                            result.rows[i].patentes = pj.rows;

                            ej = await client.query('select codigo, complemento, cep from '+
                            'tb_endereco '+
                            'where nicknamejogador = $1', [result.rows[i].nickname])
                            result.rows[i].endereco = ej.rows[0];
                        } catch (err) {
                            res.status(400).send('{'+err+'}');
                        }
                    }
                    done(); // closing the connection;
                    //console.log('retornou 201 no /listendereco');
                    res.status(201).send(result.rows);
                }
            });
        }
    });
});
sw.post('/insertjogador', function (req, res, next) {
    
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Nao conseguiu acessar o  BD "+ err);
           res.status(400).send('{'+err+'}');
       }else{            

            var q1 ={
                text: 'insert into tb_jogador (nickname, senha, quantPontos, quantdinheiro, datacadastro, data_ultimo_login, ' +
                   ' situacao) ' +
                ' values ($1,$2,$3,$4,now(), now(), $5) ' +
                                            'returning nickname, senha, quantpontos, quantdinheiro, ' +
                                            ' to_char(datacadastro, \'dd/mm/yyyy\') as datacadastro, '+
                                            ' to_char(data_ultimo_login, \'dd/mm/yyyy\') as data_ultimo_login, situacao;',
                values: [req.body.nickname, 
                         req.body.senha, 
                         req.body.quantpontos, 
                         req.body.quantdinheiro, 
                         req.body.situacao == true ? "A" : "I"]
            }
            var q2 = {
                text : 'insert into tb_endereco (complemento, cep, nicknamejogador) values ($1, $2, $3) returning codigo, complemento, cep;',
                values: [req.body.endereco.complemento, 
                         req.body.endereco.cep, 
                         req.body.nickname]
            }
            console.log(q1);

            client.query(q1, function(err,result1) {
                if(err){
                    console.log('retornou 400 no insert q1');
                    res.status(400).send('{'+err+'}');
                }else{
                    client.query(q2, async function(err,result2) {
                        if(err){
                            console.log('retornou 400 no insert q2');
                            res.status(400).send('{'+err+'}');
                        }else{
                        
                            //insere todas as pantentes na tabela associativa.
                            for(var i=0; i < req.body.patentes.length; i++){                                              

                                try {                          
        
                                    await client.query('insert into tb_jogador_conquista_patente (codpatente, nickname) values ($1, $2)', [req.body.patentes[i].codigo, req.body.nickname])
        
                                } catch (err) {
                                                                
                                    res.status(400).send('{'+err+'}');
                                }                                           
        
                            }                            

                            done(); // closing the connection;
                            console.log('retornou 201 no insertjogador');
                            res.status(201).send({"nickname" : result1.rows[0].nickname, 
                                                  "senha": result1.rows[0].senha, 
                                                  "quantpontos": result1.rows[0].quantpontos, 
                                                  "quantdinheiro": result1.rows[0].quantdinheiro,
                                                  "situacao": result1.rows[0].situacao,
                                                  "datacadastro" : result1.rows[0].datacadastro,
                                                  "data_ultimo_login" : result1.rows[0].data_ultimo_login,
                                                  "endereco": {"codigo": result2.rows[0].codigo, "cep": result2.rows[0].cep, "complemento": result2.rows[0].complemento},
                                                  "patentes": req.body.patentes});
                        }
                    });
                }           
            });
       }       
    });
});

sw.post('/insertpatentes', function (req, res, next) {
    postgres.connect(function(err,client,done) {
        if(err){
            console.log("Não conseguiu acessar o BD"+ err);
            res.status(400).send('{'+err+'}');
        }else{
            var q1 ={
                text: 'insert into tb_patente (nome, quant_min_pontos, datacriacao, cor, logotipo) values ($1, $2, now(), $3, $4) returning codigo, nome, quant_min_pontos, datacriacao, cor, logotipo',
                values :[req.body.nome, req.body.quant_min_pontos, req.body.cor, req.body.logotipo]
            }

            client.query(q1, function(err,result1) {
                if(err){
                    console.log('retornou 400 no insert q1');
                    res.status(400).send('{'+err+'}');
                }else{
                    console.log('retornou 201 no insertpatentes');
                    res.status(201).send({"codigo": result1.rows[0].codigo, "nome": result1.rows[0].nome,
                     "quant_min_pontos" : result1.rows[0].quant_min_pontos, "cor" : result1.rows[0].cor,
                    "datacriacao" : result1.rows[0].datacriacao, "logotipo" : result1.rows[0].logotipo});
                }
            })
        }
    })
})

sw.post('/updatepatentes', function (req, res, next) {
    postgres.connect(function(err,client,done) {
        if(err){
            console.log("Não conseguiu acessar o BD"+ err);
            res.status(400).send('{'+err+'}');
        }else{
            var q1 ={
                text: 'update tb_patente set nome=$1, quant_min_pontos=$2, cor=$3, logotipo=$4 where tb_patente.codigo=$5  returning codigo, nome, quant_min_pontos, to_char(datacriacao, \'dd/mm/yyyy hh24:mm:ss\') as datcriacao, cor, logotipo',
                values :[req.body.nome, req.body.quant_min_pontos, req.body.cor, req.body.logotipo, req.body.codigo]
            }

            client.query(q1, function(err,result1) {
                if(err){
                    console.log('retornou 400 no update q1');
                    res.status(400).send('{'+err+'}');
                }else{
                    console.log('retornou 201 no updatepatentes');
                    res.status(201).send({"nome": result1.rows[0].nome,"quant_min_pontos" : result1.rows[0].quant_min_pontos, 
                    "cor" : result1.rows[0].cor, "datacriacao" : result1.rows[0].datacriacao,
                     "logotipo" : result1.rows[0].logotipo,"codigo": result1.rows[0].codigo});
                }
            })
        }
    })
})

sw.get('/deletepatentes/:codigo', function(req, res, next){
    postgres.connect(function (err, client, done) {
        if (err) {
            console.log("Não conseguiu acessar o banco de dados!" + err);
            res.status(400).send('{' + err + '}');
        } else {

            var q = {
                text: 'delete FROM tb_patente where codigo = $1',
                values: [req.params.codigo]
            }}
            client.query(q, function(err, result){
                if(err){
                    console.log(err);
                    res.status(400).send('{' + err + '}');
                }else{
                    res.status(200).send({'codigo': req.params.codigo})
                }
            })
        })
})

sw.listen(4000, function () {
    console.log('Server is running.. on Port 4000');
});