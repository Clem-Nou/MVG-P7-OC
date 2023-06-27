const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

exports.signup = (req, res, next) => {
  bcrypt
    .hash(req.body.password, 10)
    .then(hash => {
      const user = new User({
        email: req.body.email,
        password: hash,
      });
      console.log('User data:', user); // Vérifier les données de l'utilisateur
      user
        .save()
        .then(() => {
          console.log('Utilisateur enregistré avec succès !');
          res.status(201).json({ message: 'Utilisateur créé !' });
        })
        .catch(error => {
          console.log(
            "Erreur lors de l'enregistrement de l'utilisateur:",
            error,
          );
          res.status(400).json({ error });
        });
    })
    .catch(error => {
      console.log('Erreur lors du hachage du mot de passe:', error);
      res.status(500).json({ error });
    });
};

exports.login = (req, res, next) => {
  User.findOne({ email: req.body.email })
    .then(user => {
      if (!user) {
        console.log('Utilisateur non trouvé');
        return res
          .status(401)
          .json({ message: 'Paire login/mot de passe incorrecte' });
      }
      bcrypt
        .compare(req.body.password, user.password)
        .then(valid => {
          if (!valid) {
            console.log('Mot de passe incorrect');
            return res
              .status(401)
              .json({ message: 'Paire login/mot de passe incorrecte' });
          }
          console.log('Connexion réussie !');
          res.status(200).json({
            userId: user._id,
            token: jwt.sign({ userId: user._id }, 'RANDOM_TOKEN_SECRET', {
              expiresIn: '24h',
            }),
          });
        })
        .catch(error => {
          console.log(
            'Erreur lors de la comparaison des mots de passe:',
            error,
          );
          res.status(500).json({ error });
        });
    })
    .catch(error => {
      console.log("Erreur lors de la recherche de l'utilisateur:", error);
      res.status(500).json({ error });
    });
};
