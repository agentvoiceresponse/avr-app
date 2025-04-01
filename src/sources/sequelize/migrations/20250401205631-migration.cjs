const { DataTypes } = require('sequelize');


/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    await queryInterface.createTable('endpoints', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      secret: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
      },
      updatedAt: {
        type: DataTypes.DATE,
      },
    });

    await queryInterface.addColumn('endpoints', 'tenant', {
      type: DataTypes.STRING,
      allowNull: false,
    });

    await queryInterface.addIndex('endpoints', ['tenant'], {
      unique: false,
    });

    await queryInterface.addColumn('asr', 'tenant', {
      type: DataTypes.STRING,
      allowNull: false,
    });

    await queryInterface.addColumn('core', 'tenant', {
      type: DataTypes.STRING,
      allowNull: false,
    });

    await queryInterface.addColumn('llm', 'tenant', {
      type: DataTypes.STRING,
      allowNull: false,
    });

    await queryInterface.addColumn('tts', 'tenant', {
      type: DataTypes.STRING,
      allowNull: false,
    });

    await queryInterface.addIndex('asr', ['tenant'], {
      unique: false,
    });

    await queryInterface.addIndex('core', ['tenant'], {
      unique: false,
    });

    await queryInterface.addIndex('llm', ['tenant'], {
      unique: false,
    });

    await queryInterface.addIndex('tts', ['tenant'], {
      unique: false,
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeIndex('tts', ['tenant']);
    await queryInterface.removeIndex('llm', ['tenant']);
    await queryInterface.removeIndex('core', ['tenant']);
    await queryInterface.removeIndex('asr', ['tenant']);
    await queryInterface.removeIndex('endpoints', ['tenant']);

    await queryInterface.removeColumn('tts', 'tenant');
    await queryInterface.removeColumn('llm', 'tenant');
    await queryInterface.removeColumn('core', 'tenant');
    await queryInterface.removeColumn('asr', 'tenant');
    await queryInterface.removeColumn('endpoints', 'tenant');

    await queryInterface.dropTable('endpoints');
  },
};
