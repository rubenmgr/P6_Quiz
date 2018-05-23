const Sequelize = require("sequelize");
const {models} = require("../models");

// Autoload the quiz with id equals to :quizId
exports.load = (req, res, next, quizId) => {

    models.quiz.findById(quizId)
    .then(quiz => {
        if (quiz) {
            req.quiz = quiz;
            next();
        } else {
            throw new Error('There is no quiz with id=' + quizId);
        }
    })
    .catch(error => next(error));
};


// GET /quizzes
exports.index = (req, res, next) => {

    models.quiz.findAll()
    .then(quizzes => {
        res.render('quizzes/index.ejs', {quizzes});
    })
    .catch(error => next(error));
};


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/show', {quiz});
};


// GET /quizzes/new
exports.new = (req, res, next) => {

    const quiz = {
        question: "", 
        answer: ""
    };

    res.render('quizzes/new', {quiz});
};

// POST /quizzes/create
exports.create = (req, res, next) => {

    const {question, answer} = req.body;

    const quiz = models.quiz.build({
        question,
        answer
    });

    // Saves only the fields question and answer into the DDBB
    quiz.save({fields: ["question", "answer"]})
    .then(quiz => {
        req.flash('success', 'Quiz created successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/new', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error creating a new Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/edit
exports.edit = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/edit', {quiz});
};


// PUT /quizzes/:quizId
exports.update = (req, res, next) => {

    const {quiz, body} = req;

    quiz.question = body.question;
    quiz.answer = body.answer;

    quiz.save({fields: ["question", "answer"]})
    .then(quiz => {
        req.flash('success', 'Quiz edited successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/edit', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error editing the Quiz: ' + error.message);
        next(error);
    });
};


// DELETE /quizzes/:quizId
exports.destroy = (req, res, next) => {

    req.quiz.destroy()
    .then(() => {
        req.flash('success', 'Quiz deleted successfully.');
        res.redirect('/quizzes');
    })
    .catch(error => {
        req.flash('error', 'Error deleting the Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/play
exports.play = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || '';

    res.render('quizzes/play', {
        quiz,
        answer
    });
};


// GET /quizzes/:quizId/check
exports.check = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || "";
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    res.render('quizzes/result', {
        quiz,
        result,
        answer
    });
};
// GET /quizzes/randomplay

exports.randomplay = (req, res, next) => {

    if(req.session.randomplay === undefined){ //Si no hay array lo creamos, si hay es el que esta
        req.session.randomplay =[];
    }else{
        req.session.randomplay = req.session.randomplay
    }
    Sequelize.Promise.resolve()
        .then(() => {
            return models.quiz.count({where: {"id": {[Sequelize.Op.notIn]: req.session.randomplay}}}) // Contamos los quizzes que no esten ya en randomplay
                .then(long => {    // Los "Guardamos" aquí
                    let id = Math.floor(Math.random()*long); //Sacamos el id aleatorio
                    return models.quiz.findAll({ where: {"id": {[Sequelize.Op.notIn]: req.session.randomplay}}}) //buscamos todos lo quiz que no esten en randomplay y los guardamos en quizzes
                        .then(quizzes => {
                            return quizzes[id]; //Devolvemos una quiz
                        });
                })
                .catch(error =>  next(error)

                );
        })
        .then(quiz => {
            let score = req.session.randomplay.length;
            res.render('quizzes/random_play', {score ,quiz});
        })
};


// GET /quizzes/randomcheck/:quizId(\\+d)

exports.randomcheck = (req, res, next) => {

    let NoQuiz; //creamos una variable global para almacenar el numero de quizzes total

    Sequelize.Promise.resolve()
        .then(() => {
            return models.quiz.count()
                .then(long => {
                    NoQuiz = long; //almacenamos el numero de quizzes para saber cuantos hay

                })
                .catch(error =>  next(error)

                );
        })
        .then(() => {
            const answer = req.query.answer || '';
            const result = answer.toLowerCase().trim() === req.quiz.answer.toLowerCase().trim();
            if(result){             //Si hemos acertado
                req.session.randomplay.push(req.quiz.id);       //guardamos el id en randomplay
                const score = req.session.randomplay.length;    //Guardamos el score que es numero de ids en randomplay
                if(score === NoQuiz){                   //Si hemos llegado al numero max
                    req.session.randomplay = [];        //vaciamos
                    res.render('quizzes/random_nomore',{score}); //sacamos nomore
                }

                res.render('quizzes/random_result',{result,score,answer}); //Si quedan ,sacamos el resultado parcial

            }

            else{ //Si fallamos
                const score = req.session.randomplay.length; //guardamos puntos
                req.session.randomplay = []; //limpiamos
                res.render('quizzes/random_result',{result,score,answer}); //Sacamos el resultado
            }
        });
};