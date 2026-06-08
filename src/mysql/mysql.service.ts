import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createConnection } from 'mysql2/promise';
import { ConfigService } from '../config/config.service';
import { MysqlServiceConfigDto } from '../swarm/dto/create-project-service.dto';

@Injectable()
export class MysqlService {
  constructor(private readonly config: ConfigService) {}

  async provisionProjectDatabase(mysql: MysqlServiceConfigDto) {
    const adminConfig = this.getMysqlRootConfig();
    const connection = await createConnection(adminConfig);

    try {
      await connection.query(`CREATE DATABASE IF NOT EXISTS ??`, [mysql.db]);
      await connection.query(`CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?`, [
        mysql.user,
        mysql.password
      ]);
      await connection.query(`GRANT ALL PRIVILEGES ON ??.* TO ?@'%'`, [
        mysql.db,
        mysql.user
      ]);
      await connection.query('FLUSH PRIVILEGES');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'MySQL provisioning error';

      throw new ServiceUnavailableException({
        ok: false,
        message
      });
    } finally {
      await connection.end();
    }
  }

  private getMysqlRootConfig() {
    try {
      return this.config.requireMysqlRootConfig();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'MySQL root credentials are missing';

      throw new ServiceUnavailableException({
        ok: false,
        message
      });
    }
  }
}
