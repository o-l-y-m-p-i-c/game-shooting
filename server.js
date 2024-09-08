const io = require('socket.io')(8765);
const players = {};
let bullets = {};
const scores = {};

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Initialize scores and player state
  scores[socket.id] = 0;
  players[socket.id] = { x: 0, y: 0, direction: { x: 0, y: 0 }, id: socket.id };

  // Handle player movement
  socket.on('player_move', (player) => {
    players[socket.id] = { ...player, id: socket.id };
    io.emit('update_players', players);
  });

  // Handle shooting bullets
  socket.on('shoot_bullet', (direction) => {
    const player = players[socket.id];
    if (player) {
      const bulletId = socket.id + Date.now();
      bullets[bulletId] = {
        x: player.x,
        y: player.y,
        direction: direction,
        id: bulletId,
        shooterId: socket.id
      };
      io.emit('shoot_bullet', bullets[bulletId]);
    }
  });

  // Handle player disconnect
  socket.on('disconnect', () => {
    delete players[socket.id];
    delete scores[socket.id];
    io.emit('update_players', players);
  });
});

// Update bullet positions and check collisions
setInterval(() => {
    const updatedBullets = {};

    if(bullets.length !== 0){

    Object.values(bullets).forEach(bullet => {
        bullet.x += bullet.direction.x * 15;
        bullet.y += bullet.direction.y * 15;

        let hit = false;

        // Check collision with other players
        Object.values(players).forEach(player => {
        if (bullet.shooterId !== player.id && // Ensure the bullet is not hitting its shooter
            bullet.x > player.x - 10 && bullet.x < player.x + 10 &&
            bullet.y > player.y - 10 && bullet.y < player.y + 10) {
            // Bullet hit a player
            hit = true;

            // Increment score for the shooter
            if (scores[bullet.shooterId] !== undefined) {
            scores[bullet.shooterId]++;
            }

            console.log(`Bullet hit player: ${player.id}. Shooter: ${bullet.shooterId}. New score: ${scores[bullet.shooterId]}`);

            // Notify players of the collision
            io.emit('bullet_hit', {
            bulletId: bullet.id,
            shooterId: bullet.shooterId,
            victimId: player.id,
            score: scores[bullet.shooterId]
            });

            // Remove the bullet as it hit a player
        }
        });

        // Only keep bullets that are still active and within bounds
        if (!hit && (bullet.x >= 0 && bullet.x <= 800 && bullet.y >= 0 && bullet.y <= 600)) {
        updatedBullets[bullet.id] = bullet;
        }
    });

    // Replace old bullets with updated bullets
    bullets = updatedBullets;

    // Emit updated bullets
    io.emit('update_bullets', Object.values(updatedBullets));
    }
}, 50);
