const bcrypt = require("bcrypt");

const plainPassword = "anand123";
const saltRounds = 10;

bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
    if (err) {
        console.error(err);
    } else {
        console.log("Hashed password:", hash);
    }
});